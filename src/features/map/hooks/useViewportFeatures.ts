"use client";

import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { FeaturesResponse } from "@/features/constraints/types/constraint";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useFetchJson } from "@/shared/hooks/useFetchJson";
import { MIN_FETCH_ZOOM, type Viewport } from "../types/map";
import { boundsToBboxParam } from "../utils/coords";

const MOVE_DEBOUNCE_MS = 250;
const FEATURE_LIMIT = 1000;

function readViewport(map: LeafletMap): Viewport {
  return { bbox: boundsToBboxParam(map.getBounds()), zoom: map.getZoom() };
}

/**
 * Fetches only the features inside the current map viewport, re-fetching (debounced) after
 * each pan or zoom and whenever the selected datasets change. Must be used inside <MapContainer>.
 */
export function useViewportFeatures(datasetIds: readonly string[]) {
  const map = useMap();
  const [viewport, setViewport] = useState<Viewport>(() => readViewport(map));
  useMapEvents({ moveend: () => setViewport(readViewport(map)) });

  const settled = useDebouncedValue(viewport, MOVE_DEBOUNCE_MS);
  const tooFarOut = settled.zoom < MIN_FETCH_ZOOM;
  const enabled = !tooFarOut && datasetIds.length > 0;

  const params = new URLSearchParams({
    bbox: settled.bbox,
    zoom: String(settled.zoom),
    limit: String(FEATURE_LIMIT),
    datasets: datasetIds.join(","),
  });
  const result = useFetchJson<FeaturesResponse>(enabled ? `/api/features?${params}` : null);

  return {
    /** Latest loaded features. Kept while a new viewport loads, so the map does not flash empty. */
    features: enabled ? result.lastData : undefined,
    /** Changes whenever `features` is a new response; use it as a React key for <GeoJSON>. */
    featuresKey: result.lastDataUrl,
    loading: result.loading,
    error: result.error,
    tooFarOut,
    noDatasets: datasetIds.length === 0,
    truncated: Boolean(enabled && result.lastData?.truncated),
  };
}
