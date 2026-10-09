import { findConstraintsAtPoint } from "@/features/constraints/server/queries";
import type { ConstraintsAtPointResponse } from "@/features/constraints/types/constraint";
import { apiHandler } from "@/shared/lib/http";
import { parseLatLng } from "@/shared/lib/params";

// GET /api/constraints?lat=&lng=  → constraints containing the point
export const GET = apiHandler(async (request): Promise<ConstraintsAtPointResponse> => {
  const point = parseLatLng(request.nextUrl.searchParams);
  return { ...point, constraints: await findConstraintsAtPoint(point) };
});
