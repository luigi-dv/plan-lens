import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { clamp, parseLatLng, parseNumber } from "./params";

const q = (s: string) => new URLSearchParams(s);

describe("parseNumber", () => {
  it("parses finite numbers", () => {
    expect(parseNumber("52.23", "lat")).toBe(52.23);
    expect(parseNumber("-0.34", "lng")).toBe(-0.34);
  });

  it.each([null, "", "   ", "abc", "Infinity", "1e999", "NaN"])("rejects %j", (raw) => {
    expect(() => parseNumber(raw, "x")).toThrow(ValidationError);
  });
});

describe("parseLatLng", () => {
  it("returns named fields (lat and lng cannot be swapped by position)", () => {
    expect(parseLatLng(q("lat=52.23&lng=21.01"))).toEqual({ lat: 52.23, lng: 21.01 });
  });

  it("accepts the boundary values", () => {
    expect(parseLatLng(q("lat=90&lng=180"))).toEqual({ lat: 90, lng: 180 });
    expect(parseLatLng(q("lat=-90&lng=-180"))).toEqual({ lat: -90, lng: -180 });
  });

  it("rejects out-of-range values instead of clamping them", () => {
    expect(() => parseLatLng(q("lat=90.0001&lng=0"))).toThrow(/lat must be between/);
    expect(() => parseLatLng(q("lat=0&lng=-180.5"))).toThrow(/lng must be between/);
    // A lat/lng swap of a Warsaw point puts "lat" at 21.01 (valid) and "lng" at 52.23 (valid):
    // range checks cannot catch that, which is why the API only ever takes named params.
    expect(parseLatLng(q("lat=21.01&lng=52.23"))).toEqual({ lat: 21.01, lng: 52.23 });
    expect(() => parseLatLng(q("lat=21.01&lng=181"))).toThrow(ValidationError);
  });

  it("requires both params", () => {
    expect(() => parseLatLng(q("lat=51"))).toThrow(/lng is required/);
    expect(() => parseLatLng(q("lng=1"))).toThrow(/lat is required/);
  });

  it("supports custom key names", () => {
    expect(parseLatLng(q("latA=1&lngA=2"), { lat: "latA", lng: "lngA" })).toEqual({ lat: 1, lng: 2 });
    expect(() => parseLatLng(q("lat=1&lng=2"), { lat: "latA", lng: "lngA" })).toThrow(/latA is required/);
  });
});

describe("clamp", () => {
  it("limits to the range", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-5, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});
