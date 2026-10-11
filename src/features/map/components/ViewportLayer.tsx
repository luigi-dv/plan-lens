"use client";

import { GeoJSON } from "react-leaflet";
import type { PathOptions } from "leaflet";
import type { Feature } from "geojson";
import { datasetInfo } from "@/features/constraints/types/datasets";
import { MIN_FETCH_ZOOM } from "../types/map";
import { useViewportFeatures } from "../hooks/useViewportFeatures";
import styles from "./ViewportLayer.module.css";

function styleFor(feature?: Feature): PathOptions {
  const color = datasetInfo(String(feature?.properties?.dataset))?.color ?? "#64748b";
  return { color, weight: 2, opacity: 0.9, fillColor: color, fillOpacity: 0.2 };
}

/** Draws the constraint polygons for the current viewport. Must be inside <MapContainer>. */
export function ViewportLayer({ datasetIds }: { datasetIds: readonly string[] }) {
  const { features, featuresKey, loading, error, tooFarOut, noDatasets, truncated } =
    useViewportFeatures(datasetIds);

  let status: string | null = null;
  if (error) status = `Could not load constraints: ${error}`;
  else if (noDatasets) status = "No layers selected";
  else if (tooFarOut) status = `Zoom in to level ${MIN_FETCH_ZOOM}+ to load constraints`;
  else if (truncated) status = "Showing the first 1,000 features in view. Zoom in to see all";
  else if (loading) status = "Loading…";

  return (
    <>
      {features ? (
        // react-leaflet's <GeoJSON> reads `data` once, so a new response needs a new key.
        // interactive={false} lets clicks fall through to the map instead of the polygon.
        <GeoJSON key={featuresKey} data={features} style={styleFor} interactive={false} />
      ) : null}
      {status ? <div className={styles.status}>{status}</div> : null}
    </>
  );
}
