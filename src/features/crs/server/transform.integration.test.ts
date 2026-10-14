import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/shared/testing/test-db";
import { transformPoints } from "./transform";

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db?.close();
});

// The Royal Castle in Warsaw and a point 0.01° of longitude due east of it.
const A = { lat: 52.2479, lng: 21.0142 };
const B = { lat: 52.2479, lng: 21.0242 };

describe("transformPoints", () => {
  it("reproduces known coordinates in EPSG:3857 and EPSG:2180", async () => {
    const { a } = await transformPoints(A, B, db.pool);
    expect(a.epsg4326).toEqual({ x: A.lng, y: A.lat });
    // Web Mercator: x = R * lng(rad), R = 6378137.
    expect(a.epsg3857.x).toBeCloseTo((6378137 * A.lng * Math.PI) / 180, 0);
    // PUWG 1992: central meridian 19°E with false easting 500 km, so Warsaw (~2° east) sits
    // near easting 637 km; false northing −5 300 km puts it near northing 488 km.
    expect(a.epsg2180.x).toBeGreaterThan(630_000);
    expect(a.epsg2180.x).toBeLessThan(645_000);
    expect(a.epsg2180.y).toBeGreaterThan(480_000);
    expect(a.epsg2180.y).toBeLessThan(495_000);
  });

  it("shows why degrees are not a length: 0.01° of longitude is ~680 m here, not 1,110 m", async () => {
    const { distance } = await transformPoints(A, B, db.pool);
    expect(distance.degrees).toBeCloseTo(0.01, 6);
    // 0.01° of longitude on the ellipsoid at 52.25°N ≈ 683 m
    expect(distance.geographyM).toBeGreaterThan(675);
    expect(distance.geographyM).toBeLessThan(690);
    // PUWG 1992's scale error ~140 km from its central meridian is about −0.05 %.
    expect(Math.abs(distance.puwg2180M - distance.geographyM) / distance.geographyM).toBeLessThan(0.002);
    // Web Mercator stretches distances by 1/cos(lat) ≈ 1.64 at this latitude.
    expect(distance.webMercator3857M / distance.geographyM).toBeGreaterThan(1.55);
    expect(distance.webMercator3857M / distance.geographyM).toBeLessThan(1.7);
  });
});
