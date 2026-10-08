import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, insertPolygon, rectangle, type TestDb } from "@/shared/testing/test-db";
import { NotFoundError } from "@/shared/lib/errors";
import {
  findConstraintArea,
  findConstraintsAtPoint,
  findConstraintsNearby,
  findFeaturesInBbox,
} from "./queries";

/**
 * Runs against the Dockerised PostGIS (npm run db:up) in a throwaway schema.
 *
 * Fixtures are rectangles in central Warsaw (so EPSG:2180, Poland's grid, is valid for them):
 *   A "Monument A": lng 21.000..21.010, lat 52.230..52.240  (~680 m x ~1,110 m)
 *   B "Reserve B":  lng 21.005..21.015, lat 52.235..52.245  overlaps A
 *   C "Far away":   lng 20.000..20.010, lat 51.000..51.010  (still in Poland, ~150 km away)
 *
 * Test points are declared below as { lat, lng }.
 */
const INSIDE_A_ONLY = { lat: 52.232, lng: 21.002 };
const INSIDE_A_AND_B = { lat: 52.237, lng: 21.007 };
const OUTSIDE_ALL = { lat: 52.1, lng: 21.2 };
// 0.005° east of A's east edge at lat 52.235: roughly 340 m away. Also B's south-east corner.
const NEAR_A = { lat: 52.235, lng: 21.015 };

let db: TestDb;
let idA: number;
let idB: number;

beforeAll(async () => {
  db = await createTestDb();
  idA = await insertPolygon(db.pool, {
    name: "Monument A",
    dataset: "historic-monument",
    ring: rectangle(21.0, 52.23, 21.01, 52.24),
    properties: { reference: "PL.TEST.A", "documentation-url": "https://example.test/a" },
  });
  idB = await insertPolygon(db.pool, {
    name: "Reserve B",
    dataset: "nature-reserve",
    ring: rectangle(21.005, 52.235, 21.015, 52.245),
  });
  await insertPolygon(db.pool, {
    name: "Far away",
    dataset: "historic-monument",
    ring: rectangle(20.0, 51.0, 20.01, 51.01),
  });
});

afterAll(async () => {
  await db?.close();
});

describe("findConstraintsAtPoint (ST_Intersects)", () => {
  it("returns the polygon when the point is inside it", async () => {
    const hits = await findConstraintsAtPoint(INSIDE_A_ONLY, db.pool);
    expect(hits.map((h) => h.name)).toEqual(["Monument A"]);
    expect(hits[0]).toMatchObject({
      id: idA,
      dataset: "historic-monument",
      reference: "PL.TEST.A",
      documentationUrl: "https://example.test/a",
      distanceM: 0,
    });
  });

  it("returns every overlapping polygon, smallest area first", async () => {
    const hits = await findConstraintsAtPoint(INSIDE_A_AND_B, db.pool);
    expect(hits.map((h) => h.id).sort()).toEqual([idA, idB].sort());
    expect(hits[0].areaM2).toBeLessThanOrEqual(hits[1].areaM2);
  });

  it("returns nothing for a point outside every polygon", async () => {
    expect(await findConstraintsAtPoint(OUTSIDE_ALL, db.pool)).toEqual([]);
  });

  it("is lng-first: swapping lat and lng finds nothing", async () => {
    const swapped = { lat: INSIDE_A_ONLY.lng, lng: INSIDE_A_ONLY.lat };
    expect(await findConstraintsAtPoint(swapped, db.pool)).toEqual([]);
  });
});

describe("findConstraintsNearby (ST_DWithin on geography, metres)", () => {
  it("finds a polygon within the radius and reports the distance in metres", async () => {
    const hits = await findConstraintsNearby(NEAR_A, 1000, db.pool);
    const a = hits.find((h) => h.id === idA);
    // NEAR_A is B's south-east corner (distance 0). A's east edge is 0.005° (~340 m) west.
    expect(hits.find((h) => h.id === idB)?.distanceM).toBeCloseTo(0, 3);
    expect(a).toBeDefined();
    expect(a!.distanceM).toBeGreaterThan(325);
    expect(a!.distanceM).toBeLessThan(355);
  });

  it("excludes polygons beyond the radius", async () => {
    const hits = await findConstraintsNearby(NEAR_A, 100, db.pool);
    expect(hits.map((h) => h.id)).toEqual([idB]);
  });

  it("orders nearest first and never returns the far-away polygon", async () => {
    const hits = await findConstraintsNearby(NEAR_A, 5000, db.pool);
    const distances = hits.map((h) => h.distanceM);
    expect(distances).toEqual([...distances].sort((x, y) => x - y));
    expect(hits.map((h) => h.name)).not.toContain("Far away");
  });
});

describe("findFeaturesInBbox (&& ST_MakeEnvelope, clipped and simplified)", () => {
  const around = { minLng: 20.99, minLat: 52.22, maxLng: 21.02, maxLat: 52.25 };

  it("returns a GeoJSON FeatureCollection of features in the viewport only", async () => {
    const fc = await findFeaturesInBbox(around, { zoom: null, limit: 100, datasets: null }, db.pool);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features.map((f) => f.properties.name).sort()).toEqual(["Monument A", "Reserve B"]);
    expect(fc.truncated).toBe(false);
  });

  it("uses GeoJSON [lng, lat] coordinate order", async () => {
    const fc = await findFeaturesInBbox(around, { zoom: null, limit: 100, datasets: ["historic-monument"] }, db.pool);
    const geom = fc.features[0].geometry;
    const positions = geom.type === "MultiPolygon" ? geom.coordinates.flat(2) : geom.coordinates.flat(1);
    for (const [lng, lat] of positions) {
      expect(lng).toBeGreaterThanOrEqual(21.0 - 1e-9);
      expect(lng).toBeLessThanOrEqual(21.01 + 1e-9);
      expect(lat).toBeGreaterThanOrEqual(52.23 - 1e-9);
      expect(lat).toBeLessThanOrEqual(52.24 + 1e-9);
    }
  });

  it("filters by dataset", async () => {
    const fc = await findFeaturesInBbox(around, { zoom: null, limit: 100, datasets: ["nature-reserve"] }, db.pool);
    expect(fc.features.map((f) => f.properties.name)).toEqual(["Reserve B"]);
  });

  it("flags truncation when the limit cuts the result", async () => {
    const fc = await findFeaturesInBbox(around, { zoom: null, limit: 1, datasets: null }, db.pool);
    expect(fc.features).toHaveLength(1);
    expect(fc.truncated).toBe(true);
  });

  it("clips a huge feature to the viewport plus margin instead of sending all of it", async () => {
    // A ~70 km x 110 km rectangle, densified to ~4,000 vertices like a real regional boundary.
    const { rows } = await db.pool.query<{ id: number }>(
      `INSERT INTO constraints (name, dataset, geom)
       VALUES ('Huge', 'protected-landscape-area',
               ST_Multi(ST_Segmentize(ST_MakeEnvelope(20.5, 51.7, 21.5, 52.7, 4326), 0.001)))
       RETURNING id`,
    );
    const view = { minLng: 21.0, minLat: 52.2, maxLng: 21.02, maxLat: 52.22 };
    const fc = await findFeaturesInBbox(view, { zoom: 16, limit: 100, datasets: ["protected-landscape-area"] }, db.pool);
    const geom = fc.features[0].geometry;
    const positions = geom.type === "MultiPolygon" ? geom.coordinates.flat(2) : geom.coordinates.flat(1);
    // Clip box = viewport expanded by 25 % per side: lng 20.995..21.025, lat 52.195..52.225.
    expect(positions.length).toBeLessThan(20);
    for (const [lng, lat] of positions) {
      expect(lng).toBeGreaterThanOrEqual(20.995 - 1e-9);
      expect(lng).toBeLessThanOrEqual(21.025 + 1e-9);
      expect(lat).toBeGreaterThanOrEqual(52.195 - 1e-9);
      expect(lat).toBeLessThanOrEqual(52.225 + 1e-9);
    }
    // Area is still measured on the stored, unclipped geometry.
    const { areaM2 } = await findConstraintArea(rows[0].id, db.pool);
    expect(areaM2).toBeGreaterThan(7e9);
    await db.pool.query("DELETE FROM constraints WHERE id = $1", [rows[0].id]);
  });

  it("simplifies geometry at low zoom (fewer vertices)", async () => {
    const { rows } = await db.pool.query<{ id: number }>(
      `INSERT INTO constraints (name, dataset, geom)
       SELECT 'Wiggly', 'historic-monument',
              ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(20.5, 52.5), 4326), 0.01, 64))
       RETURNING id`,
    );
    const box = { minLng: 20.48, minLat: 52.48, maxLng: 20.52, maxLat: 52.52 };
    const full = await findFeaturesInBbox(box, { zoom: 18, limit: 10, datasets: null }, db.pool);
    const coarse = await findFeaturesInBbox(box, { zoom: 6, limit: 10, datasets: null }, db.pool);
    const count = (g: (typeof full)["features"][number]["geometry"]) =>
      g.type === "MultiPolygon" ? g.coordinates.flat(2).length : g.coordinates.flat(1).length;
    expect(count(coarse.features[0].geometry)).toBeLessThan(count(full.features[0].geometry));
    await db.pool.query("DELETE FROM constraints WHERE id = $1", [rows[0].id]);
  });
});

describe("findConstraintArea (ST_Area on EPSG:2180)", () => {
  it("returns square metres that agree with an independent ellipsoidal measurement", async () => {
    const { areaM2, srid } = await findConstraintArea(idA, db.pool);
    expect(srid).toBe(2180);
    const { rows } = await db.pool.query<{ geog: number; degrees: number }>(
      "SELECT ST_Area(geom::geography)::float8 AS geog, ST_Area(geom)::float8 AS degrees FROM constraints WHERE id = $1",
      [idA],
    );
    // ~680 m x ~1,110 m ≈ 0.76 km². Projected (2180) and ellipsoidal (geography) area agree to <0.2 %.
    expect(areaM2).toBeGreaterThan(700_000);
    expect(areaM2).toBeLessThan(820_000);
    expect(Math.abs(areaM2 - rows[0].geog) / rows[0].geog).toBeLessThan(0.002);
    // The raw 4326 area is in square degrees: ~1e-4, nothing like m².
    expect(rows[0].degrees).toBeLessThan(0.001);
  });

  it("throws NotFoundError for an unknown id", async () => {
    await expect(findConstraintArea(2_000_000_000, db.pool)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("schema", () => {
  it("has GIST indexes on geom and, for the parts, on the geography cast", async () => {
    const { rows } = await db.pool.query<{ tablename: string; indexdef: string }>(
      "SELECT tablename, indexdef FROM pg_indexes WHERE schemaname = current_schema()",
    );
    const defs = (table: string) => rows.filter((r) => r.tablename === table).map((r) => r.indexdef);
    expect(defs("constraints").some((d) => /USING gist \(geom\)/.test(d))).toBe(true);
    expect(defs("constraint_parts").some((d) => /USING gist \(geom\)/.test(d))).toBe(true);
    expect(defs("constraint_parts").some((d) => /USING gist \(\(\(geom\)::geography\)\)/.test(d))).toBe(true);
  });

  it("subdivides every constraint into parts of at most 256 vertices that cover it exactly", async () => {
    const { rows } = await db.pool.query<{ id: number }>(
      // A 4,001-vertex circle. (A densified rectangle would not do: ST_Subdivide drops
      // collinear vertices and returns a couple of tiny parts.)
      `INSERT INTO constraints (name, dataset, geom)
       VALUES ('Dense', 'protected-landscape-area',
               ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(21, 52.2), 4326), 0.5, 1000)))
       RETURNING id`,
    );
    const {
      rows: [stats],
    } = await db.pool.query<{ parts: number; max_vertices: number; same_area: boolean }>(
      `SELECT count(*)::int AS parts, max(ST_NPoints(p.geom))::int AS max_vertices,
              abs(sum(ST_Area(p.geom)) - ST_Area(c.geom)) / ST_Area(c.geom) < 1e-9 AS same_area
       FROM constraint_parts p JOIN constraints c ON c.id = p.constraint_id
       WHERE c.id = $1 GROUP BY c.geom`,
      [rows[0].id],
    );
    expect(stats.parts).toBeGreaterThan(10);
    expect(stats.max_vertices).toBeLessThanOrEqual(256);
    expect(stats.same_area).toBe(true);

    // Deleting a constraint removes its parts.
    await db.pool.query("DELETE FROM constraints WHERE id = $1", [rows[0].id]);
    const { rows: left } = await db.pool.query("SELECT 1 FROM constraint_parts WHERE constraint_id = $1", [rows[0].id]);
    expect(left).toHaveLength(0);
  });

  it("computes area_m2 in EPSG:2180 as a generated column", async () => {
    const { rows } = await db.pool.query<{ stored: number; live: number }>(
      "SELECT area_m2 AS stored, ST_Area(ST_Transform(geom, 2180)) AS live FROM constraints WHERE id = $1",
      [idA],
    );
    expect(rows[0].stored).toBeCloseTo(rows[0].live, 6);
  });

  it("rejects non-MultiPolygon or wrong-SRID geometry", async () => {
    await expect(
      db.pool.query(
        "INSERT INTO constraints (name, dataset, geom) VALUES ('x','y', ST_SetSRID(ST_MakePoint(0,0), 4326))",
      ),
    ).rejects.toThrow();
    // Coordinates in EPSG:2180 must be reprojected before they go in (as scripts/import.ts does).
    await expect(
      db.pool.query(
        "INSERT INTO constraints (name, dataset, geom) VALUES ('x','y', ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(637000, 488000), 2180), 100)))",
      ),
    ).rejects.toThrow();
  });
});
