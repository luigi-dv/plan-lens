import type { LatLng } from "@/shared/types/geo";
import { ValidationError } from "./errors";

export const LAT_RANGE = { min: -90, max: 90 } as const;
export const LNG_RANGE = { min: -180, max: 180 } as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Parses a required finite number. `Number("")` is 0 and `Number("1e999")` is
 * Infinity, so empty strings and non-finite results are rejected explicitly.
 */
export function parseNumber(raw: string | null, name: string): number {
  if (raw === null || raw.trim() === "") {
    throw new ValidationError(`${name} is required`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${name} must be a finite number`);
  }
  return value;
}

/**
 * Latitude and longitude are rejected, not clamped, when out of range: silently
 * moving a bad point to the nearest valid one would return confident wrong answers
 * (and a swapped lat/lng pair is the most common client bug).
 */
export function parseLatLng(
  params: URLSearchParams,
  keys: { lat: string; lng: string } = { lat: "lat", lng: "lng" },
): LatLng {
  const lat = parseNumber(params.get(keys.lat), keys.lat);
  const lng = parseNumber(params.get(keys.lng), keys.lng);
  if (lat < LAT_RANGE.min || lat > LAT_RANGE.max) {
    throw new ValidationError(`${keys.lat} must be between ${LAT_RANGE.min} and ${LAT_RANGE.max}`);
  }
  if (lng < LNG_RANGE.min || lng > LNG_RANGE.max) {
    throw new ValidationError(`${keys.lng} must be between ${LNG_RANGE.min} and ${LNG_RANGE.max}`);
  }
  return { lat, lng };
}
