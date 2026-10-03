import { Pool, type QueryResult, type QueryResultRow } from "pg";

/** Anything with a pg-style `query`: a Pool, a PoolClient, or a test double. */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<R>>;
}

// Reuse one pool across Next.js dev hot reloads and warm serverless invocations.
const globalForPg = globalThis as unknown as { planlensPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.planlensPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set (copy .env.example to .env)");
    }
    globalForPg.planlensPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
    });
  }
  return globalForPg.planlensPool;
}
