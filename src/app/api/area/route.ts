import { findConstraintArea } from "@/features/constraints/server/queries";
import { parseId } from "@/features/constraints/server/validation";
import { apiHandler } from "@/shared/lib/http";

// GET /api/area?id=  → area in m², measured in EPSG:2180 (PUWG 1992, Poland's national grid)
export const GET = apiHandler(async (request) => {
  return findConstraintArea(parseId(request.nextUrl.searchParams));
});
