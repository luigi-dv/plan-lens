import type { LatLngBounds, LatLngTuple } from "leaflet";
import type { Position } from "geojson";
import type { LatLng } from "@/shared/types/geo";

/**
 * The lon/lat vs lat/lon pitfall lives in exactly two places, both here:
 *
 *   GeoJSON  (RFC 7946, PostGIS ST_MakePoint(x, y)):   [lng, lat]   x first
 *   Leaflet  (L.latLng, <Marker position>, setView):    [lat, lng]   y first
 *
 * App code passes `{ lat, lng }` objects; only these helpers produce arrays.
 */
export function toLeafletTuple({ lat, lng }: LatLng): LatLngTuple {
  return [lat, lng];
}

export function toGeoJsonPosition({ lat, lng }: LatLng): Position {
  return [lng, lat];
}

export function fromGeoJsonPosition([lng, lat]: Position): LatLng {
  return { lat, lng };
}

/** `minLng,minLat,maxLng,maxLat`, the order /api/features expects (x/y, like an envelope). */
export function boundsToBboxParam(bounds: LatLngBounds): string {
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    .map((n) => n.toFixed(6))
    .join(",");
}
