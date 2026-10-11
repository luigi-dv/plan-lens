import { describe, expect, it } from "vitest";
import { formatArea, formatDistance } from "./format";

describe("formatArea", () => {
  it("uses square metres", () => {
    expect(formatArea(950.4)).toBe("950 m²");
  });

  it("adds hectares for large areas", () => {
    expect(formatArea(67_619)).toBe("67,619 m² (6.8 ha)");
  });
});

describe("formatDistance", () => {
  it("reports metres and kilometres", () => {
    expect(formatDistance(0)).toBe("inside");
    expect(formatDistance(0.4)).toBe("<1 m");
    expect(formatDistance(345.6)).toBe("346 m");
    expect(formatDistance(1234)).toBe("1.23 km");
  });
});
