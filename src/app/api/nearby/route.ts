import { findConstraintsNearby } from "@/features/constraints/server/queries";
import { parseRadius } from "@/features/constraints/server/validation";
import type { NearbyResponse } from "@/features/constraints/types/constraint";
import { apiHandler } from "@/shared/lib/http";
import { parseLatLng } from "@/shared/lib/params";

// GET /api/nearby?lat=&lng=&radius=  → constraints within `radius` metres (max 5000)
export const GET = apiHandler(async (request): Promise<NearbyResponse> => {
  const params = request.nextUrl.searchParams;
  const point = parseLatLng(params);
  const radiusM = parseRadius(params);
  return { ...point, radiusM, constraints: await findConstraintsNearby(point, radiusM) };
});
