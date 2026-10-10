"use client";

import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";
import type { LatLng } from "@/shared/types/geo";
import { useMapClick } from "../hooks/useMapClick";
import { INITIAL_CENTER, INITIAL_ZOOM } from "../types/map";
import { toLeafletTuple } from "../utils/coords";
import { markerIcon } from "../utils/leafletIcons";
import { ViewportLayer } from "./ViewportLayer";

export interface MapProps {
  selected: LatLng | null;
  radiusM: number;
  datasetIds: readonly string[];
  onSelect: (point: LatLng) => void;
}

function ClickHandler({ onSelect }: Pick<MapProps, "onSelect">) {
  useMapClick(onSelect);
  return null;
}

/** The Leaflet map. Imported with ssr: false (see MapClient) because Leaflet needs `window`. */
export default function Map({ selected, radiusM, datasetIds, onSelect }: MapProps) {
  return (
    <MapContainer
      center={toLeafletTuple(INITIAL_CENTER)}
      zoom={INITIAL_ZOOM}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ViewportLayer datasetIds={datasetIds} />
      <ClickHandler onSelect={onSelect} />
      {selected ? (
        <>
          {/* Circle radius is in metres, drawn on the Web Mercator map by Leaflet. */}
          <Circle
            center={toLeafletTuple(selected)}
            radius={radiusM}
            pathOptions={{ color: "#0f172a", weight: 1, dashArray: "4 4", fillOpacity: 0.04 }}
            interactive={false}
          />
          <Marker position={toLeafletTuple(selected)} icon={markerIcon} interactive={false} />
        </>
      ) : null}
    </MapContainer>
  );
}
