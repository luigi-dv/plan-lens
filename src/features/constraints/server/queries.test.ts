import { describe, expect, it } from "vitest";
import { degreesPerPixel, FULL_DETAIL_ZOOM, simplifyTolerance } from "./queries";

describe("simplifyTolerance", () => {
  it("is zero (no simplification) without a zoom or at full-detail zoom", () => {
    expect(simplifyTolerance(null)).toBe(0);
    expect(simplifyTolerance(FULL_DETAIL_ZOOM)).toBe(0);
    expect(simplifyTolerance(18)).toBe(0);
  });

  it("is one screen pixel in degrees at lower zooms, and gets coarser as you zoom out", () => {
    expect(simplifyTolerance(0)).toBeCloseTo(360 / 256, 10);
    expect(simplifyTolerance(10)).toBeCloseTo(degreesPerPixel(10), 12);
    expect(simplifyTolerance(8)).toBeGreaterThan(simplifyTolerance(12));
  });
});
