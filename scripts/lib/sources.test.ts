import { describe, expect, it } from "vitest";
import { DATASETS } from "../../src/features/constraints/types/datasets";
import { declaredSrid, SOURCES } from "./sources";

describe("declaredSrid", () => {
  it("reads the shapes real WFS servers emit", () => {
    expect(declaredSrid({ type: "EPSG", properties: { code: "2180" } })).toBe(2180); // GDOŚ
    expect(declaredSrid("EPSG:2180")).toBe(2180); // NID
    expect(declaredSrid({ type: "name", properties: { name: "urn:ogc:def:crs:EPSG::2180" } })).toBe(2180);
  });

  it("returns null when there is no crs (RFC 7946 GeoJSON, which is always WGS84)", () => {
    expect(declaredSrid(undefined)).toBeNull();
    expect(declaredSrid({ type: "name", properties: { name: "something else" } })).toBeNull();
  });
});

describe("SOURCES", () => {
  it("only feed datasets the UI knows about", () => {
    const known = new Set(DATASETS.map((d) => d.id));
    for (const source of SOURCES) expect(known).toContain(source.dataset);
  });

  it("keeps a reserve and its buffer zone apart but merges a Natura site listed under both directives", () => {
    const reserves = SOURCES.find((s) => s.dataset === "nature-reserve")!;
    const reserve = { kodinspire: "PL.ZIPOP.1393.RP.1", nazwa: "Las Kabacki" };
    const buffer = { kodinspire: "PL.ZIPOP.1393.RP.1", nazwa: "Las Kabacki - otulina" };
    expect(reserves.groupKey(reserve)).not.toBe(reserves.groupKey(buffer));

    const [birds, habitats] = SOURCES.filter((s) => s.dataset === "natura-2000");
    expect(birds.groupKey({ kod: "PLC140001" })).toBe(habitats.groupKey({ kod: "PLC140001" }));
  });
});
