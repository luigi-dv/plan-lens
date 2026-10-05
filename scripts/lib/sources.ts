/**
 * Where the raw data in data/ comes from, and how each source maps onto the `constraints`
 * table. Used by scripts/fetch-data.ts (download) and scripts/import.ts (load).
 *
 * Every source is published in EPSG:2180 (PUWG 1992, Poland's national metric grid), not in
 * lon/lat. The raw files are kept exactly as delivered; reprojection to EPSG:4326 happens in
 * PostGIS on import.
 *
 * Study area: the City of Warsaw plus a margin, in EPSG:2180 metres
 * (easting 620 000–658 000, northing 470 000–505 000).
 */

type Props = Record<string, unknown>;

export interface Source {
  /** File name in data/. */
  file: string;
  /** `constraints.dataset` value; must match DATASETS in features/constraints/types/datasets.ts. */
  dataset: string;
  publisher: string;
  url: string;
  /** SRID of the coordinates in the file. Checked against the file's own `crs` member. */
  srid: number;
  name(p: Props): string;
  reference(p: Props): string | null;
  documentationUrl(p: Props): string | null;
  /**
   * Source features with the same key become one row (their geometries are unioned).
   * Needed because NID splits one monument into several Polygon features, and Natura 2000
   * sites designated under both directives appear once per directive.
   */
  groupKey(p: Props): string;
}

const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));

// --- GDOŚ: Central Register of Nature Protection Forms (GeoServer WFS) -----------------
// WFS 1.0.0 BBOX is easting,northing (x,y) even in EPSG:2180.
const GDOS_BBOX = "620000,470000,658000,505000";
const gdosUrl = (layer: string) =>
  `https://sdi.gdos.gov.pl/wfs?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature` +
  `&TYPENAME=GDOS:${layer}&BBOX=${GDOS_BBOX},EPSG:2180&OUTPUTFORMAT=application/json`;

const GDOS = "Generalna Dyrekcja Ochrony Środowiska (GDOŚ)";

const gdos = (file: string, layer: string, dataset: string): Source => ({
  file,
  dataset,
  publisher: GDOS,
  url: gdosUrl(layer),
  srid: 2180,
  name: (p) => String(p.nazwa ?? "Unnamed"),
  reference: (p) => str(p.kodinspire),
  documentationUrl: () => null,
  // A reserve and its buffer zone ("… - otulina") share a kodinspire but are separate
  // designations, so the name is part of the key.
  groupKey: (p) => `${p.kodinspire ?? p.gid}|${p.nazwa ?? ""}`,
});

const natura = (file: string, layer: string): Source => ({
  ...gdos(file, layer, "natura-2000"),
  reference: (p) => str(p.kod),
  documentationUrl: (p) =>
    p.kod ? `https://natura2000.eea.europa.eu/Natura2000/SDF.aspx?site=${p.kod}` : null,
  // PLC… sites are designated under both directives and appear in both layers: merge by code.
  groupKey: (p) => String(p.kod),
});

// --- NID: Monuments of History (Intergraph WFS 2.0) ---------------------------------------
// WFS 2.0 follows the EPSG axis order, which for EPSG:2180 is northing,easting, so the same
// study area is written with the axes swapped compared with the GDOŚ request above.
const NID_BBOX = "470000,620000,505000,658000";

export const SOURCES: readonly Source[] = [
  {
    file: "nid-monuments-of-history.geojson",
    dataset: "historic-monument",
    publisher: "Narodowy Instytut Dziedzictwa (NID)",
    url:
      `https://usluga.zabytek.gov.pl/INSPIRE_WFS_MHD/service.svc/get?SERVICE=WFS&VERSION=2.0.0` +
      `&REQUEST=GetFeature&TYPENAMES=gmgml:Monuments_of_History` +
      `&OUTPUTFORMAT=application/vnd.geo%2Bjson&BBOX=${NID_BBOX},EPSG:2180`,
    srid: 2180,
    name: (p) => String(p.SITENAME ?? "Unnamed").trim(),
    reference: (p) => str(p.INSPIREID),
    documentationUrl: (p) => str(p.LEGALFOUNDATIONDOCUMENT),
    groupKey: (p) => String(p.INSPIREID),
  },
  gdos("gdos-nature-reserves.geojson", "Rezerwaty", "nature-reserve"),
  natura("gdos-natura2000-birds.geojson", "ObszarySpecjalnejOchrony"),
  natura("gdos-natura2000-habitats.geojson", "SpecjalneObszaryOchrony"),
  gdos("gdos-protected-landscape-areas.geojson", "ObszaryChronionegoKrajobrazu", "protected-landscape-area"),
  gdos("gdos-nature-landscape-complexes.geojson", "ZespolyPrzyrodniczoKrajobrazowe", "nature-landscape-complex"),
  gdos("gdos-ecological-sites.geojson", "UzytkiEkologiczne", "ecological-site"),
];

/**
 * SRID declared by a GeoJSON file's `crs` member. RFC 7946 removed `crs` (GeoJSON is meant to
 * be WGS84 only), but WFS servers still emit it, in more than one shape:
 *   GDOŚ: { "type": "EPSG", "properties": { "code": "2180" } }
 *   NID:  "EPSG:2180"
 *   also: { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::2180" } }
 */
export function declaredSrid(crs: unknown): number | null {
  if (crs === null || crs === undefined) return null;
  const text =
    typeof crs === "string"
      ? crs
      : JSON.stringify((crs as { properties?: unknown }).properties ?? crs);
  const match = text.match(/EPSG\D*(\d{4,5})|"code"\s*:\s*"?(\d{4,5})/i);
  return match ? Number(match[1] ?? match[2]) : null;
}
