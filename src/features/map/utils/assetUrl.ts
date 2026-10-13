import type { StaticImageData } from "next/image";

/**
 * URL of a statically imported image. Next's types say an image import is
 * `StaticImageData` (`{ src, width, height }`), but Turbopack compiles images imported from
 * node_modules (e.g. leaflet/dist/images/*.png) to a plain URL string. Accept both.
 */
export function assetUrl(asset: StaticImageData | string): string {
  const url = typeof asset === "string" ? asset : asset?.src;
  if (!url) throw new Error("Static image import resolved to neither a URL nor { src }");
  return url;
}
