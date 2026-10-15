import type { PoolClient } from "pg";
import { getPool } from "../src/shared/lib/db";
import { NEARBY_SQL, VIEWPORT_SQL } from "../src/features/constraints/server/queries";

/**
 * EXPLAIN ANALYZE of the real viewport and nearby queries, before and after the GIST indexes.
 *
 * The imported dataset has only ~80 rows, where the planner will (rightly) pick a sequential
 * scan either way. To show what the index buys, this script fills a *synthetic* table with
 * 200,000 random polygons across Poland and runs the same SQL from queries.ts against it.
 * Numbers are medians of 7 runs after a warm-up. The table is dropped at the end.
 */
const ROWS = 200_000;
const RUNS = 7;
const TABLE = "constraints_bench";

interface PlanNode {
  "Node Type": string;
  "Index Name"?: string;
  Plans?: PlanNode[];
}

function nodeTypes(node: PlanNode): string[] {
  return [
    node["Node Type"] + (node["Index Name"] ? ` (${node["Index Name"]})` : ""),
    ...(node.Plans ?? []).flatMap(nodeTypes),
  ];
}

async function explain(client: PoolClient, sql: string, params: unknown[]) {
  const times: number[] = [];
  let plan: PlanNode = { "Node Type": "?" };
  for (let i = 0; i < RUNS + 1; i++) {
    const { rows } = await client.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, params);
    const result = rows[0]["QUERY PLAN"][0] as { Plan: PlanNode; "Execution Time": number };
    plan = result.Plan;
    if (i > 0) times.push(result["Execution Time"]); // i = 0 is the warm-up
  }
  times.sort((a, b) => a - b);
  const scans = nodeTypes(plan).filter((t) => /Scan/.test(t));
  return { ms: times[Math.floor(times.length / 2)], scans: scans.join(" → ") };
}

async function main() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await client.query(`
      CREATE TABLE ${TABLE} (
        id serial PRIMARY KEY, name text, dataset text, properties jsonb DEFAULT '{}',
        geom geometry(MultiPolygon, 4326))`);
    await client.query(
      `INSERT INTO ${TABLE} (name, dataset, geom)
       SELECT 'Synthetic ' || i, 'nature-reserve',
              ST_Multi(ST_Buffer(ST_SetSRID(ST_MakePoint(14.1 + random() * 10, 49 + random() * 5.8), 4326),
                                 0.003 + random() * 0.007, 8))
       FROM generate_series(1, $1) AS i`,
      [ROWS],
    );
    await client.query(`ANALYZE ${TABLE}`);

    const viewportSql = VIEWPORT_SQL.replace("FROM constraints c", `FROM ${TABLE} c`);
    const nearbySql = NEARBY_SQL.replace("FROM constraints c", `FROM ${TABLE} c`);
    // A central-Warsaw viewport at zoom 12, and a 1 km radius around the Royal Castle.
    const viewportParams = [20.9, 52.18, 21.12, 52.28, 0.0879, null, 1001];
    const nearbyParams = [21.0142, 52.2479, 1000];

    const [{ count: inView }] = (
      await client.query(
        `SELECT count(*)::int AS count FROM ${TABLE} WHERE geom && ST_MakeEnvelope(20.9, 52.18, 21.12, 52.28, 4326)`,
      )
    ).rows;
    const [{ count: inRadius }] = (
      await client.query(
        `SELECT count(*)::int AS count FROM ${TABLE}
         WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(21.0142, 52.2479), 4326)::geography, 1000)`,
      )
    ).rows;

    const results: { query: string; index: string; ms: number; scans: string }[] = [];
    const record = async (query: string, index: string, sql: string, params: unknown[]) =>
      results.push({ query, index, ...(await explain(client, sql, params)) });

    await record("viewport (&&)", "none", viewportSql, viewportParams);
    await record("nearby (ST_DWithin geography)", "none", nearbySql, nearbyParams);

    await client.query(`CREATE INDEX ${TABLE}_geom_gist ON ${TABLE} USING GIST (geom)`);
    await client.query(`ANALYZE ${TABLE}`);
    await record("viewport (&&)", "GIST (geom)", viewportSql, viewportParams);
    await record("nearby (ST_DWithin geography)", "GIST (geom) only", nearbySql, nearbyParams);

    await client.query(`CREATE INDEX ${TABLE}_geog_gist ON ${TABLE} USING GIST ((geom::geography))`);
    await client.query(`ANALYZE ${TABLE}`);
    await record("nearby (ST_DWithin geography)", "+ GIST ((geom::geography))", nearbySql, nearbyParams);

    console.log(`Synthetic table: ${ROWS.toLocaleString("en-GB")} random polygons (Poland bbox).`);
    console.log(`Viewport matches ${inView} rows; 1 km radius matches ${inRadius} rows.\n`);
    console.log("| Query | Index | Median execution time | Scan nodes |");
    console.log("| --- | --- | ---: | --- |");
    for (const r of results) {
      console.log(`| ${r.query} | ${r.index} | ${r.ms.toFixed(2)} ms | ${r.scans} |`);
    }
  } finally {
    await client.query(`DROP TABLE IF EXISTS ${TABLE}`).catch(() => undefined);
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
