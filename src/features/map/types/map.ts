import type { LatLng } from "@/shared/types/geo";

/** Initial view: central Warsaw, where the bundled datasets are. */
export const INITIAL_CENTER: LatLng = { lat: 52.2297, lng: 21.0122 };
export const INITIAL_ZOOM = 12;

/** Features are only fetched at or above this zoom so a zoomed-out view never asks for everything. */
export const MIN_FETCH_ZOOM = 9;

export const DEFAULT_RADIUS_M = 500;
export const MIN_RADIUS_M = 50;
export const MAX_RADIUS_M = 5000;

/** What the map reports about its viewport after each pan or zoom. */
export interface Viewport {
  /** minLng,minLat,maxLng,maxLat in EPSG:4326, as the /api/features `bbox` param. */
  bbox: string;
  zoom: number;
}
