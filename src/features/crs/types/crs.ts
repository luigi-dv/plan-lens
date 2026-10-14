export interface ProjectedPoint {
  /** Easting / x. Degrees (lng) in 4326, metres otherwise. */
  x: number;
  /** Northing / y. Degrees (lat) in 4326, metres otherwise. */
  y: number;
}

export interface CrsPointResult {
  /** WGS84 lon/lat in degrees. What GeoJSON, GPS and the database store. */
  epsg4326: ProjectedPoint;
  /** Web Mercator in metres. What Leaflet / OSM tiles use on screen. */
  epsg3857: ProjectedPoint;
  /** PUWG 1992, Poland's national grid, in metres. x = easting, y = northing (see CrsExplorer). */
  epsg2180: ProjectedPoint;
}

/** The same A→B separation, measured four different ways. */
export interface CrsDistanceResult {
  /** ST_Distance on 4326 geometry: a number in *degrees*, not a length. */
  degrees: number;
  /** ST_Distance on geography: metres on the WGS84 ellipsoid. */
  geographyM: number;
  /** ST_Distance after ST_Transform to 2180: metres on Poland's national grid. */
  puwg2180M: number;
  /** ST_Distance after ST_Transform to 3857: "metres" stretched by Mercator, wrong for ground distance. */
  webMercator3857M: number;
}

export interface CrsResponse {
  a: CrsPointResult;
  b: CrsPointResult;
  distance: CrsDistanceResult;
  /** The exact SQL that produced this response. */
  sql: string;
}
