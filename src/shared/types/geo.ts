/**
 * A WGS84 point in EPSG:4326, held as named fields so `lat` and `lng` can never be
 * swapped by position. Convert to arrays only at the library boundary
 * (see features/map/utils/coords.ts).
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Viewport in EPSG:4326 degrees. */
export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}
