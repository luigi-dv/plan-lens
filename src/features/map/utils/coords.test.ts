import { describe, expect, it } from "vitest";
import { fromGeoJsonPosition, toGeoJsonPosition, toLeafletTuple } from "./coords";

const royalCastle = { lat: 52.2479, lng: 21.0142 };

describe("coordinate order", () => {
  it("Leaflet is [lat, lng]", () => {
    expect(toLeafletTuple(royalCastle)).toEqual([52.2479, 21.0142]);
  });

  it("GeoJSON is [lng, lat]", () => {
    expect(toGeoJsonPosition(royalCastle)).toEqual([21.0142, 52.2479]);
  });

  it("round-trips GeoJSON positions", () => {
    expect(fromGeoJsonPosition(toGeoJsonPosition(royalCastle))).toEqual(royalCastle);
  });
});
