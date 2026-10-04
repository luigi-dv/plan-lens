import { getPool } from "../src/shared/lib/db";
import { applySchema } from "./lib/schema";

async function main() {
  const pool = getPool();
  try {
    await applySchema(pool);
    console.log("Schema applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
