import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Queryable } from "../../src/shared/lib/db";

/** Applies db/schema.sql (idempotent). Requires the postgis extension to exist already. */
export async function applySchema(db: Queryable): Promise<void> {
  const sql = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await db.query(sql);
}
