export interface DatasetInfo {
  id: string;
  label: string;
  /** The designation's name in Polish, as the source publishes it. */
  labelPl: string;
  color: string;
  /** Drawn on the map on first load. Point lookups always search every dataset. */
  defaultVisible: boolean;
}

/** Datasets bundled in data/ (see scripts/lib/sources.ts) and imported by `npm run db:import`. */
export const DATASETS: readonly DatasetInfo[] = [
  { id: "historic-monument", label: "Historic monuments", labelPl: "Pomniki historii", color: "#9f1239", defaultVisible: true },
  { id: "nature-reserve", label: "Nature reserves", labelPl: "Rezerwaty przyrody", color: "#15803d", defaultVisible: true },
  { id: "natura-2000", label: "Natura 2000 sites", labelPl: "Obszary Natura 2000", color: "#1d4ed8", defaultVisible: true },
  { id: "nature-landscape-complex", label: "Nature-landscape complexes", labelPl: "Zespoły przyrodniczo-krajobrazowe", color: "#7c3aed", defaultVisible: true },
  { id: "ecological-site", label: "Ecological sites", labelPl: "Użytki ekologiczne", color: "#0e7490", defaultVisible: true },
  // Covers most of the city, so it would wash out every other layer if drawn by default.
  { id: "protected-landscape-area", label: "Protected landscape areas", labelPl: "Obszary chronionego krajobrazu", color: "#a16207", defaultVisible: false },
];

export const DEFAULT_DATASET_IDS: readonly string[] = DATASETS.filter((d) => d.defaultVisible).map(
  (d) => d.id,
);

export function datasetInfo(id: string): DatasetInfo | undefined {
  return DATASETS.find((d) => d.id === id);
}
