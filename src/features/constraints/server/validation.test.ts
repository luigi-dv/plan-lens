import { describe, expect, it } from "vitest";
import { ValidationError } from "@/shared/lib/errors";
import {
  LIMIT_DEFAULT,
  LIMIT_MAX,
  parseBbox,
  parseDatasets,
  parseId,
  parseLimit,
  parseRadius,
  parseZoom,
  RADIUS_DEFAULT_M,
  RADIUS_MAX_M,
} from "./validation";

const q = (s: string) => new URLSearchParams(s);

describe("parseRadius", () => {
  it("defaults when absent", () => {
    expect(parseRadius(q(""))).toBe(RADIUS_DEFAULT_M);
    expect(parseRadius(q("radius="))).toBe(RADIUS_DEFAULT_M);
  });

  it("passes through valid values", () => {
    expect(parseRadius(q("radius=250"))).toBe(250);
  });

  it("clamps to 1..5000 m", () => {
    expect(parseRadius(q("radius=999999"))).toBe(RADIUS_MAX_M);
    expect(parseRadius(q("radius=-10"))).toBe(1);
    expect(parseRadius(q("radius=0"))).toBe(1);
  });

  it("rejects non-numeric input", () => {
    expect(() => parseRadius(q("radius=lots"))).toThrow(ValidationError);
    expect(() => parseRadius(q("radius=Infinity"))).toThrow(ValidationError);
  });
});

describe("parseBbox", () => {
  it("parses minLng,minLat,maxLng,maxLat", () => {
    expect(parseBbox(q("bbox=-0.4,51.6,-0.2,51.9"))).toEqual({
      minLng: -0.4,
      minLat: 51.6,
      maxLng: -0.2,
      maxLat: 51.9,
    });
  });

  it("clamps a box that spills over the world edge (wrapped Leaflet viewports)", () => {
    expect(parseBbox(q("bbox=-200,-95,200,95"))).toEqual({
      minLng: -180,
      minLat: -90,
      maxLng: 180,
      maxLat: 90,
    });
  });

  it("rejects a missing, short or non-numeric bbox", () => {
    expect(() => parseBbox(q(""))).toThrow(/bbox is required/);
    expect(() => parseBbox(q("bbox=1,2,3"))).toThrow(/minLng,minLat,maxLng,maxLat/);
    expect(() => parseBbox(q("bbox=1,2,3,x"))).toThrow(/maxLat must be a finite number/);
    expect(() => parseBbox(q("bbox=1,2,3,"))).toThrow(/maxLat is required/);
  });

  it("rejects an inverted box", () => {
    expect(() => parseBbox(q("bbox=1,2,0,3"))).toThrow(/minimums must not exceed/);
    expect(() => parseBbox(q("bbox=0,3,1,2"))).toThrow(/minimums must not exceed/);
  });
});

describe("parseZoom / parseLimit", () => {
  it("zoom is optional, rounded and clamped", () => {
    expect(parseZoom(q(""))).toBeNull();
    expect(parseZoom(q("zoom=12.4"))).toBe(12);
    expect(parseZoom(q("zoom=99"))).toBe(22);
    expect(parseZoom(q("zoom=-3"))).toBe(0);
  });

  it("limit defaults and clamps", () => {
    expect(parseLimit(q(""))).toBe(LIMIT_DEFAULT);
    expect(parseLimit(q("limit=5000"))).toBe(LIMIT_MAX);
    expect(parseLimit(q("limit=0"))).toBe(1);
    expect(parseLimit(q("limit=10.9"))).toBe(10);
  });
});

describe("parseDatasets", () => {
  it("returns null when absent", () => {
    expect(parseDatasets(q(""))).toBeNull();
  });

  it("splits a comma list", () => {
    expect(parseDatasets(q("datasets=historic-monument,natura-2000"))).toEqual([
      "historic-monument",
      "natura-2000",
    ]);
  });

  it("rejects anything that is not a dataset slug", () => {
    expect(() => parseDatasets(q("datasets=a;drop table constraints"))).toThrow(ValidationError);
    expect(() => parseDatasets(q("datasets=A"))).toThrow(ValidationError);
    expect(() => parseDatasets(q("datasets=a,,b"))).toThrow(ValidationError);
    expect(() => parseDatasets(q(`datasets=${"a,".repeat(11)}a`))).toThrow(ValidationError);
  });
});

describe("parseId", () => {
  it("accepts positive integers", () => {
    expect(parseId(q("id=72"))).toBe(72);
  });

  it.each(["0", "-1", "1.5", "99999999999", "abc", ""])("rejects %j", (id) => {
    expect(() => parseId(q(`id=${id}`))).toThrow(ValidationError);
  });
});
