import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { assetUrl } from "./assetUrl";

/**
 * Leaflet works out its default marker image paths from the stylesheet URL, which bundlers
 * rewrite, so the default icon 404s. Importing the images lets the bundler emit them, and an
 * explicit icon passed to <Marker icon={…}> sidesteps the lookup entirely.
 */
export const markerIcon = L.icon({
  iconUrl: assetUrl(iconUrl),
  iconRetinaUrl: assetUrl(iconRetinaUrl),
  shadowUrl: assetUrl(shadowUrl),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
