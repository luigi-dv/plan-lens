import { ValidationError } from "@/shared/lib/errors";
import { clamp, LAT_RANGE, LNG_RANGE, parseNumber } from "@/shared/lib/params";
import type { BBox } from "@/shared/types/geo";

export const RADIUS_DEFAULT_M = 500;
export const RADIUS_MIN_M = 1;
export const RADIUS_MAX_M = 5000;

export const LIMIT_DEFAULT = 500;
export const LIMIT_MAX = 1000;

export const ZOOM_MAX = 22;

const DATASET_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_DATASETS = 10;

/** Radius in metres. Optional (default 500); anything outside 1..5000 is clamped. */
export function parseRadius(params: URLSearchParams): number {
  const raw = params.get("radius");
  if (raw === null || raw.trim() === "") return RADIUS_DEFAULT_M;
  return clamp(parseNumber(raw, "radius"), RADIUS_MIN_M, RADIUS_MAX_M);
}

/**
 * `bbox=minLng,minLat,maxLng,maxLat` in EPSG:4326. Leaflet reports longitudes beyond
 * ±180 when the map is panned across the antimeridian, so the box is clamped to the
 * world rather than rejected; an inverted box is a client bug and is rejected.
 */
export function parseBbox(params: URLSearchParams): BBox {
  const raw = params.get("bbox");
  if (raw === null || raw.trim() === "") throw new ValidationError("bbox is required");
  const parts = raw.split(",");
  if (parts.length !== 4) {
    throw new ValidationError("bbox must be minLng,minLat,maxLng,maxLat");
  }
  const [minLng, minLat, maxLng, maxLat] = parts.map((part, i) =>
    parseNumber(part, ["minLng", "minLat", "maxLng", "maxLat"][i]),
  );
  if (minLng > maxLng || minLat > maxLat) {
    throw new ValidationError("bbox minimums must not exceed maximums");
  }
  return {
    minLng: clamp(minLng, LNG_RANGE.min, LNG_RANGE.max),
    minLat: clamp(minLat, LAT_RANGE.min, LAT_RANGE.max),
    maxLng: clamp(maxLng, LNG_RANGE.min, LNG_RANGE.max),
    maxLat: clamp(maxLat, LAT_RANGE.min, LAT_RANGE.max),
  };
}

/** Optional integer map zoom (0..22), used to pick a simplification tolerance. */
export function parseZoom(params: URLSearchParams): number | null {
  const raw = params.get("zoom");
  if (raw === null || raw.trim() === "") return null;
  return clamp(Math.round(parseNumber(raw, "zoom")), 0, ZOOM_MAX);
}

/** Optional row limit; default 500, clamped to 1..1000. */
export function parseLimit(params: URLSearchParams): number {
  const raw = params.get("limit");
  if (raw === null || raw.trim() === "") return LIMIT_DEFAULT;
  return clamp(Math.floor(parseNumber(raw, "limit")), 1, LIMIT_MAX);
}

/** Optional comma-separated dataset ids. Returns null for "no filter". */
export function parseDatasets(params: URLSearchParams): string[] | null {
  const raw = params.get("datasets");
  if (raw === null || raw.trim() === "") return null;
  const ids = raw.split(",").map((s) => s.trim());
  if (ids.length > MAX_DATASETS || ids.some((id) => !DATASET_ID.test(id))) {
    throw new ValidationError("datasets must be up to 10 comma-separated dataset ids");
  }
  return ids;
}

/** Required positive integer id (Postgres `serial`, so it fits in int4). */
export function parseId(params: URLSearchParams): number {
  const value = parseNumber(params.get("id"), "id");
  if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
    throw new ValidationError("id must be a positive integer");
  }
  return value;
}
