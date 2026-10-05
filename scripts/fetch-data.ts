import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { declaredSrid, SOURCES } from "./lib/sources";

/** Downloads every source in scripts/lib/sources.ts into data/, unchanged. */
async function main() {
  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });

  for (const source of SOURCES) {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`${source.file}: HTTP ${response.status} from ${source.url}`);
    const text = await response.text();
    const json = JSON.parse(text) as { features?: unknown[]; crs?: unknown };
    if (!Array.isArray(json.features)) throw new Error(`${source.file}: not a FeatureCollection`);
    const srid = declaredSrid(json.crs);
    if (srid !== source.srid) {
      throw new Error(`${source.file}: expected EPSG:${source.srid}, file declares ${srid ?? "nothing"}`);
    }
    await writeFile(path.join(dir, source.file), text);
    console.log(`${source.file}: ${json.features.length} features (EPSG:${srid})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
