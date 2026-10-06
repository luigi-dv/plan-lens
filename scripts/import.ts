import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { getPool } from "../src/shared/lib/db";
import { applySchema } from "./lib/schema";
import { declaredSrid, SOURCES } from "./lib/sources";

/**
 * Loads every file listed in scripts/lib/sources.ts into `constraints`, replacing what is there.
 *
 * Geometry pipeline, all in SQL:
 *   1. ST_GeomFromGeoJSON → ST_SetSRID(…, 2180)   the file's coordinates are PUWG 1992 metres
 *   2. ST_Transform(…, 4326)                      reproject once, on the way in, to lon/lat
 *   3. ST_MakeValid where ST_IsValid is false     self-intersections etc. from the source
 *   4. ST_Union … GROUP BY source key             merge features split across several records
 *   5. ST_CollectionExtract(…, 3) → ST_Multi      polygons only; column type is MultiPolygon
 */
const STAGE_SQL = `
  INSERT INTO import_staging (dataset, source_key, name, properties, geom)
  VALUES ($1, $2, $3, $4::jsonb, ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($5), $6::int), 4326))`;

const MERGE_SQL = `
  INSERT INTO constraints (name, dataset, properties, geom)
  SELECT min(name), dataset, (array_agg(properties ORDER BY name))[1],
         ST_Multi(ST_CollectionExtract(
           ST_Union(CASE WHEN ST_IsValid(geom) THEN geom ELSE ST_MakeValid(geom) END), 3))
  FROM import_staging
  GROUP BY dataset, source_key
  RETURNING id`;

type SourceFeature = Feature<Geometry | null, Record<string, unknown>>;

async function main() {
  const pool = getPool();
  const client = await pool.connect();
  let staged = 0;
  let skipped = 0;
  try {
    await applySchema(client);
    await client.query("BEGIN");
    await client.query(`
      CREATE TEMP TABLE import_staging (
        dataset text, source_key text, name text, properties jsonb, geom geometry
      ) ON COMMIT DROP`);

    for (const source of SOURCES) {
      const file = path.join(process.cwd(), "data", source.file);
      const json = JSON.parse(await readFile(file, "utf8")) as FeatureCollection & { crs?: unknown };
      const srid = declaredSrid(json.crs);
      if (srid !== source.srid) {
        throw new Error(`${source.file}: expected EPSG:${source.srid}, file declares ${srid ?? "nothing"}`);
      }

      let count = 0;
      for (const feature of json.features as SourceFeature[]) {
        const props = feature.properties ?? {};
        if (!feature.geometry) {
          skipped++;
          continue;
        }
        await client.query(STAGE_SQL, [
          source.dataset,
          source.groupKey(props),
          source.name(props),
          JSON.stringify({
            reference: source.reference(props),
            "documentation-url": source.documentationUrl(props),
            publisher: source.publisher,
            source: props,
          }),
          JSON.stringify(feature.geometry),
          source.srid,
        ]);
        count++;
      }
      staged += count;
      console.log(`${source.file}: ${count} features staged from EPSG:${srid}`);
    }

    const {
      rows: [{ invalid }],
    } = await client.query<{ invalid: number }>(
      "SELECT count(*)::int AS invalid FROM import_staging WHERE NOT ST_IsValid(geom)",
    );

    // constraint_parts is refilled by the subdivide trigger as rows are inserted.
    await client.query("TRUNCATE constraints, constraint_parts RESTART IDENTITY");
    const { rowCount } = await client.query(MERGE_SQL);
    await client.query("COMMIT");
    await client.query("ANALYZE constraints");

    const { rows: perDataset } = await client.query<{ dataset: string; n: number }>(
      "SELECT dataset, count(*)::int AS n FROM constraints GROUP BY dataset ORDER BY dataset",
    );
    console.log(
      `\nDone: ${staged} source features → ${rowCount} constraints ` +
        `(${invalid} invalid geometries repaired with ST_MakeValid, ${skipped} skipped with no geometry).`,
    );
    for (const { dataset, n } of perDataset) console.log(`  ${dataset}: ${n}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
