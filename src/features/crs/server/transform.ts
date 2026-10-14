import { getPool, type Queryable } from "@/shared/lib/db";
import { parseLatLng } from "@/shared/lib/params";
import type { LatLng } from "@/shared/types/geo";
import type { CrsPointResult, CrsResponse } from "../types/crs";

/**
 * One query shows the whole CRS story: the same two points in three coordinate
 * systems, and the same separation measured in degrees, geography metres, PUWG 1992
 * (EPSG:2180) metres and Web Mercator "metres".
 *
 * ST_MakePoint(x, y) takes longitude first. SRID 4326 is declared with ST_SetSRID
 * because ST_MakePoint produces an SRID-less geometry.
 */
export const CRS_SQL = `
WITH p AS (
  SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS a,
         ST_SetSRID(ST_MakePoint($3, $4), 4326) AS b
)
SELECT
  ST_X(a)::float8 AS a_x_4326,  ST_Y(a)::float8 AS a_y_4326,
  ST_X(ST_Transform(a, 3857))::float8  AS a_x_3857,  ST_Y(ST_Transform(a, 3857))::float8  AS a_y_3857,
  ST_X(ST_Transform(a, 2180))::float8  AS a_x_2180,  ST_Y(ST_Transform(a, 2180))::float8  AS a_y_2180,
  ST_X(b)::float8 AS b_x_4326,  ST_Y(b)::float8 AS b_y_4326,
  ST_X(ST_Transform(b, 3857))::float8  AS b_x_3857,  ST_Y(ST_Transform(b, 3857))::float8  AS b_y_3857,
  ST_X(ST_Transform(b, 2180))::float8  AS b_x_2180,  ST_Y(ST_Transform(b, 2180))::float8  AS b_y_2180,
  ST_Distance(a, b)::float8                                       AS dist_degrees,
  ST_Distance(a::geography, b::geography)::float8                 AS dist_geography_m,
  ST_Distance(ST_Transform(a, 2180), ST_Transform(b, 2180))::float8   AS dist_2180_m,
  ST_Distance(ST_Transform(a, 3857), ST_Transform(b, 3857))::float8   AS dist_3857_m
FROM p`.trim();

type Row = Record<string, number>;

function pointFromRow(row: Row, prefix: "a" | "b"): CrsPointResult {
  return {
    epsg4326: { x: row[`${prefix}_x_4326`], y: row[`${prefix}_y_4326`] },
    epsg3857: { x: row[`${prefix}_x_3857`], y: row[`${prefix}_y_3857`] },
    epsg2180: { x: row[`${prefix}_x_2180`], y: row[`${prefix}_y_2180`] },
  };
}

export async function transformPoints(
  a: LatLng,
  b: LatLng,
  db: Queryable = getPool(),
): Promise<CrsResponse> {
  const { rows } = await db.query<Row>(CRS_SQL, [a.lng, a.lat, b.lng, b.lat]);
  const row = rows[0];
  return {
    a: pointFromRow(row, "a"),
    b: pointFromRow(row, "b"),
    distance: {
      degrees: row.dist_degrees,
      geographyM: row.dist_geography_m,
      puwg2180M: row.dist_2180_m,
      webMercator3857M: row.dist_3857_m,
    },
    sql: CRS_SQL,
  };
}

/** `?latA=&lngA=&latB=&lngB=`, all four required. */
export function parseCrsParams(params: URLSearchParams): { a: LatLng; b: LatLng } {
  return {
    a: parseLatLng(params, { lat: "latA", lng: "lngA" }),
    b: parseLatLng(params, { lat: "latB", lng: "lngB" }),
  };
}
