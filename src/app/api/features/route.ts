import { findFeaturesInBbox } from "@/features/constraints/server/queries";
import {
  parseBbox,
  parseDatasets,
  parseLimit,
  parseZoom,
} from "@/features/constraints/server/validation";
import { apiHandler } from "@/shared/lib/http";

// GET /api/features?bbox=minLng,minLat,maxLng,maxLat[&zoom=][&limit=][&datasets=a,b]
// → GeoJSON FeatureCollection for the map viewport (never the whole dataset)
export const GET = apiHandler(async (request) => {
  const params = request.nextUrl.searchParams;
  return findFeaturesInBbox(parseBbox(params), {
    zoom: parseZoom(params),
    limit: parseLimit(params),
    datasets: parseDatasets(params),
  });
});
