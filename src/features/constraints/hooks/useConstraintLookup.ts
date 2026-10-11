"use client";

import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useFetchJson } from "@/shared/hooks/useFetchJson";
import type { LatLng } from "@/shared/types/geo";
import type {
  ConstraintsAtPointResponse,
  NearbyResponse,
} from "../types/constraint";

const RADIUS_DEBOUNCE_MS = 250;

/**
 * Looks up what is at, and near, a clicked point. The "at point" request depends only on the
 * point; the "nearby" request also depends on the radius, which is debounced so dragging the
 * slider does not fire a request per pixel.
 */
export function useConstraintLookup(point: LatLng | null, radiusM: number) {
  const debouncedRadius = useDebouncedValue(radiusM, RADIUS_DEBOUNCE_MS);

  const pointQuery = point ? `lat=${point.lat}&lng=${point.lng}` : null;
  const inside = useFetchJson<ConstraintsAtPointResponse>(
    pointQuery ? `/api/constraints?${pointQuery}` : null,
  );
  const nearby = useFetchJson<NearbyResponse>(
    pointQuery ? `/api/nearby?${pointQuery}&radius=${debouncedRadius}` : null,
  );

  return { inside, nearby };
}

export type ConstraintLookup = ReturnType<typeof useConstraintLookup>;
