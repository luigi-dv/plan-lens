import { parseCrsParams, transformPoints } from "@/features/crs/server/transform";
import { apiHandler } from "@/shared/lib/http";

// GET /api/crs?latA=&lngA=&latB=&lngB=  → two points in 4326 / 3857 / 2180 + distances
export const GET = apiHandler(async (request) => {
  const { a, b } = parseCrsParams(request.nextUrl.searchParams);
  return transformPoints(a, b);
});
