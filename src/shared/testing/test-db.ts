import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

export interface TestDb {
  /** A pool whose search_path is the throwaway schema (then public, for PostGIS functions). */
  pool: Pool;
  close(): Promise<void>;
}

/**
 * Creates an isolated schema containing db/schema.sql's tables and returns a pool pinned
 * to it. The app's queries use unqualified table names, so they run unchanged against the
 * throwaway schema and never touch the developer's imported data.
 */
export async function createTestDb(): Promise<TestDb> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set: run `npm run db:up` and copy .env.example to .env");
  }
  const schema = `test_${randomBytes(6).toString("hex")}`;

  const admin = new Pool({ connectionString, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);

  const pool = new Pool({ connectionString, max: 2, options: `-c search_path=${schema},public` });
  const ddl = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await pool.query(ddl);

  return {
    pool,
    async close() {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}

/** Inserts a polygon given as GeoJSON [lng, lat] rings, in EPSG:4326. */
export async function insertPolygon(
  pool: Pool,
  row: { name: string; dataset: string; ring: [number, number][]; properties?: Record<string, unknown> },
): Promise<number> {
  const geometry = JSON.stringify({ type: "Polygon", coordinates: [row.ring] });
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO constraints (name, dataset, properties, geom)
     VALUES ($1, $2, $3::jsonb, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)))
     RETURNING id`,
    [row.name, row.dataset, JSON.stringify(row.properties ?? {}), geometry],
  );
  return rows[0].id;
}

/** A closed axis-aligned rectangle ring from corner coordinates (GeoJSON order: lng, lat). */
export function rectangle(minLng: number, minLat: number, maxLng: number, maxLat: number): [number, number][] {
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ];
}
