"use client";

import { useState } from "react";
import { ResultsPanel } from "@/features/constraints/components/ResultsPanel";
import { useConstraintLookup } from "@/features/constraints/hooks/useConstraintLookup";
import { DEFAULT_DATASET_IDS } from "@/features/constraints/types/datasets";
import type { LatLng } from "@/shared/types/geo";
import { DEFAULT_RADIUS_M } from "../types/map";
import { LayerToggle } from "./LayerToggle";
import styles from "./MapExplorer.module.css";
import { MapClient } from "./MapClient";
import { RadiusSlider } from "./RadiusSlider";

/** The main screen: map on the left, controls and results on the right. */
export function MapExplorer() {
  const [selected, setSelected] = useState<LatLng | null>(null);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [datasetIds, setDatasetIds] = useState<string[]>([...DEFAULT_DATASET_IDS]);

  const lookup = useConstraintLookup(selected, radiusM);

  return (
    <div className={styles.layout}>
      <div className={styles.map}>
        <MapClient
          selected={selected}
          radiusM={radiusM}
          datasetIds={datasetIds}
          onSelect={setSelected}
        />
      </div>
      <aside className={styles.side}>
        <div className={styles.controls}>
          <LayerToggle selected={datasetIds} onChange={setDatasetIds} />
          <RadiusSlider value={radiusM} onChange={setRadiusM} />
        </div>
        <div className={styles.results}>
          <ResultsPanel point={selected} radiusM={radiusM} lookup={lookup} />
        </div>
      </aside>
    </div>
  );
}
