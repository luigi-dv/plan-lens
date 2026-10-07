import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/** One planning constraint returned by the point / nearby / area endpoints. */
export interface ConstraintHit {
  id: number;
  name: string;
  dataset: string;
  reference: string | null;
  documentationUrl: string | null;
  /** Area in square metres, measured in EPSG:2180 (PUWG 1992, Poland's national grid). */
  areaM2: number;
  /** Metres from the query point (geography distance). 0 when the point is inside. */
  distanceM: number;
}

export interface ConstraintsAtPointResponse {
  lat: number;
  lng: number;
  constraints: ConstraintHit[];
}

export interface NearbyResponse {
  lat: number;
  lng: number;
  /** The radius actually used, after clamping, in metres. */
  radiusM: number;
  constraints: ConstraintHit[];
}

export interface AreaResponse {
  id: number;
  name: string;
  dataset: string;
  areaM2: number;
  /** The CRS the area was measured in. */
  srid: 2180;
}

export interface ConstraintFeatureProperties {
  id: number;
  name: string;
  dataset: string;
  reference: string | null;
}

export type ConstraintFeature = Feature<Polygon | MultiPolygon, ConstraintFeatureProperties>;

export interface FeaturesResponse extends FeatureCollection<Polygon | MultiPolygon, ConstraintFeatureProperties> {
  /** True when the row limit was hit and the viewport holds more features than returned. */
  truncated: boolean;
}
