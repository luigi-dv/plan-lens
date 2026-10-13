import { describe, expect, it } from "vitest";
import type { StaticImageData } from "next/image";
import { assetUrl } from "./assetUrl";

describe("assetUrl", () => {
  it("accepts a plain URL string (Turbopack, images from node_modules)", () => {
    expect(assetUrl("/_next/static/media/marker-icon.abc.png")).toBe(
      "/_next/static/media/marker-icon.abc.png",
    );
  });

  it("accepts StaticImageData (webpack / images from src)", () => {
    const image: StaticImageData = { src: "/_next/static/media/a.png", width: 25, height: 41 };
    expect(assetUrl(image)).toBe("/_next/static/media/a.png");
  });

  it("fails loudly instead of handing Leaflet an undefined URL", () => {
    expect(() => assetUrl({} as StaticImageData)).toThrow(/neither a URL/);
    expect(() => assetUrl("")).toThrow(/neither a URL/);
  });
});
