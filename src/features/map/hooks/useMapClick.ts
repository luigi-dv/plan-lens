"use client";

import { useMapEvents } from "react-leaflet";
import type { LatLng } from "@/shared/types/geo";

/** Calls `onSelect` with the clicked point. Must be used inside <MapContainer>. */
export function useMapClick(onSelect: (point: LatLng) => void) {
  useMapEvents({
    click(event) {
      // wrap(): panning across the antimeridian makes Leaflet report lng beyond ±180.
      const { lat, lng } = event.latlng.wrap();
      onSelect({ lat, lng });
    },
  });
}
