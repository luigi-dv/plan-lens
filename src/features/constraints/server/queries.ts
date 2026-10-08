import type { MultiPolygon, Polygon } from "geojson";
import { getPool, type Queryable } from "@/shared/lib/db";
import { NotFoundError } from "@/shared/lib/errors";
import type { BBox, LatLng } from "@/shared/types/geo";
import type {
  AreaResponse,
  ConstraintFeature,
  ConstraintHit,
  FeaturesResponse,
} from "../types/constraint";

/**
 * Every query takes the database as its last argument so integration tests can pass a
 * pool pinned to a throwaway schema. All user input goes in as $n parameters.
 *
 * Coordinates: ST_MakePoint takes (x, y) = (lng, lat). Geometry columns are EPSG:4326
 * (degrees). Distances use ::geography (metres on the WGS84 ellipsoid). Areas come from the
 * generated column `area_m2` = ST_Area(ST_Transform(geom, 2180)), i.e. EPSG:2180, PUWG 1992
 * (Poland's national grid: metres, projected for Poland). See db/schema.sql.
 *
 * Point and distance tests run against `constraint_parts` (each constraint cut up with
 * ST_Subdivide) rather than the whole polygons: some constraints have >100,000 vertices.
 */

interface HitRow {
  id: number;
  name: string;
  dataset: string;
  reference: string | null;
  documentation_url: string | null;
  area_m2: number;
  distance_m: number;
}

function toHit(row: HitRow): ConstraintHit {
  return {
    id: row.id,
    name: row.name,
    dataset: row.dataset,
    reference: row.reference,
    documentationUrl: row.documentation_url,
    areaM2: row.area_m2,
    distanceM: row.distance_m,
  };
}

/** Constraints that contain (or touch) the point: any of their parts intersects it. */
export const CONSTRAINTS_AT_POINT_SQL = `
  WITH pt AS (SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS g),
  hit AS (
    SELECT DISTINCT p.constraint_id
    FROM constraint_parts p, pt
    WHERE ST_Intersects(p.geom, pt.g)
  )
  SELECT c.id, c.name, c.dataset,
         c.properties->>'reference'         AS reference,
         c.properties->>'documentation-url' AS documentation_url,
         c.area_m2,
         0::float8 AS distance_m
  FROM hit JOIN constraints c ON c.id = hit.constraint_id
  ORDER BY c.area_m2 ASC, c.id`;

export async function findConstraintsAtPoint(
  { lat, lng }: LatLng,
  db: Queryable = getPool(),
): Promise<ConstraintHit[]> {
  const { rows } = await db.query<HitRow>(CONSTRAINTS_AT_POINT_SQL, [lng, lat]);
  return rows.map(toHit);
}

/**
 * Constraints within `radiusM` metres of the point, nearest first.
 * `::geography` makes ST_DWithin / ST_Distance work in metres; the functional GIST index on
 * (geom::geography) in db/schema.sql lets the planner use an index for it. A constraint's
 * distance is the smallest distance to any of its parts.
 */
export const NEARBY_SQL = `
  WITH pt AS (SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS g),
  near AS (
    SELECT p.constraint_id, min(ST_Distance(p.geom::geography, pt.g)) AS distance_m
    FROM constraint_parts p, pt
    WHERE ST_DWithin(p.geom::geography, pt.g, $3)
    GROUP BY p.constraint_id
  )
  SELECT c.id, c.name, c.dataset,
         c.properties->>'reference'         AS reference,
         c.properties->>'documentation-url' AS documentation_url,
         c.area_m2,
         near.distance_m::float8 AS distance_m
  FROM near JOIN constraints c ON c.id = near.constraint_id
  ORDER BY distance_m ASC, c.id
  LIMIT 50`;

export async function findConstraintsNearby(
  { lat, lng }: LatLng,
  radiusM: number,
  db: Queryable = getPool(),
): Promise<ConstraintHit[]> {
  const { rows } = await db.query<HitRow>(NEARBY_SQL, [lng, lat, radiusM]);
  return rows.map(toHit);
}

/** Degrees per screen pixel at a Web Mercator zoom level (256px tiles). */
export function degreesPerPixel(zoom: number): number {
  return 360 / (256 * 2 ** zoom);
}

/** Zoom level from which geometry is returned unsimplified. */
export const FULL_DETAIL_ZOOM = 15;

/**
 * ST_SimplifyPreserveTopology tolerance in degrees (the geometry is EPSG:4326, so the
 * tolerance is too). One screen pixel is invisible to the user and shrinks the payload.
 * 0 means "do not simplify".
 */
export function simplifyTolerance(zoom: number | null): number {
  if (zoom === null || zoom >= FULL_DETAIL_ZOOM) return 0;
  return degreesPerPixel(zoom);
}

/** How far beyond the viewport geometry is kept, as a fraction of its width/height per side. */
export const CLIP_MARGIN = 0.25;

/**
 * Viewport query.
 *
 * - `geom && ST_MakeEnvelope(...)` is a bounding-box overlap that the GIST index answers directly.
 * - ST_ClipByBox2D cuts each geometry to the viewport plus a margin. Without it, a feature that
 *   covers the whole city (the Warsaw Protected Landscape Area has ~118,000 vertices) would be
 *   sent in full on every pan. The clip edges sit outside the visible map, and panning refetches.
 *   ClipByBox2D is fast but may return invalid geometry; that is fine for drawing, and areas and
 *   point lookups always use the stored, unclipped geometry.
 * - Simplification runs after clipping, on fewer vertices.
 * - limit + 1 rows are fetched to learn whether the result was cut off.
 */
export const VIEWPORT_SQL = `
  WITH v AS (
    SELECT ST_MakeEnvelope($1::float8, $2::float8, $3::float8, $4::float8, 4326) AS box,
           ST_Expand(
             ST_MakeEnvelope($1::float8, $2::float8, $3::float8, $4::float8, 4326),
             ($3::float8 - $1::float8) * ${CLIP_MARGIN},
             ($4::float8 - $2::float8) * ${CLIP_MARGIN}
           )::box2d AS clip
  )
  SELECT c.id, c.name, c.dataset,
         c.properties->>'reference' AS reference,
         ST_AsGeoJSON(
           CASE WHEN $5::float8 > 0 THEN ST_SimplifyPreserveTopology(x.g, $5::float8) ELSE x.g END,
           6
         )::json AS geometry
  FROM constraints c
  CROSS JOIN v
  CROSS JOIN LATERAL (SELECT ST_ClipByBox2D(c.geom, v.clip) AS g) x
  WHERE c.geom && v.box
    AND NOT ST_IsEmpty(x.g)
    AND ($6::text[] IS NULL OR c.dataset = ANY($6::text[]))
  ORDER BY c.id
  LIMIT $7`;

interface ViewportRow {
  id: number;
  name: string;
  dataset: string;
  reference: string | null;
  geometry: Polygon | MultiPolygon;
}

export async function findFeaturesInBbox(
  bbox: BBox,
  options: { zoom: number | null; limit: number; datasets: string[] | null },
  db: Queryable = getPool(),
): Promise<FeaturesResponse> {
  const { rows } = await db.query<ViewportRow>(VIEWPORT_SQL, [
    bbox.minLng,
    bbox.minLat,
    bbox.maxLng,
    bbox.maxLat,
    simplifyTolerance(options.zoom),
    options.datasets,
    options.limit + 1,
  ]);
  const truncated = rows.length > options.limit;
  const features: ConstraintFeature[] = rows.slice(0, options.limit).map((row) => ({
    type: "Feature",
    id: row.id,
    geometry: row.geometry,
    properties: {
      id: row.id,
      name: row.name,
      dataset: row.dataset,
      reference: row.reference,
    },
  }));
  return { type: "FeatureCollection", features, truncated };
}

/** Area in m², measured in EPSG:2180 (PUWG 1992), not in degrees (generated column). */
export const AREA_SQL = `
  SELECT id, name, dataset, area_m2
  FROM constraints
  WHERE id = $1`;

export async function findConstraintArea(
  id: number,
  db: Queryable = getPool(),
): Promise<AreaResponse> {
  const { rows } = await db.query<{ id: number; name: string; dataset: string; area_m2: number }>(
    AREA_SQL,
    [id],
  );
  if (rows.length === 0) throw new NotFoundError(`No constraint with id ${id}`);
  const row = rows[0];
  return { id: row.id, name: row.name, dataset: row.dataset, areaM2: row.area_m2, srid: 2180 };
}
