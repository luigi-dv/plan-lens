const nf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/** Square metres, with hectares alongside once the number gets large. */
export function formatArea(areaM2: number): string {
  const m2 = `${nf.format(areaM2)} m²`;
  return areaM2 >= 10_000 ? `${m2} (${nf1.format(areaM2 / 10_000)} ha)` : m2;
}

/** Metres below 1 km, kilometres above. Zero means the point is inside. */
export function formatDistance(distanceM: number): string {
  if (distanceM <= 0) return "inside";
  if (distanceM < 1) return "<1 m";
  if (distanceM < 1000) return `${nf.format(distanceM)} m`;
  return `${nf2.format(distanceM / 1000)} km`;
}
