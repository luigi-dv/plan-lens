import styles from "./Crs.module.css";

const ROWS = [
  { where: "GeoJSON position (RFC 7946)", code: "[21.0142, 52.2479]", order: "[lng, lat]" },
  { where: "PostGIS", code: "ST_MakePoint(21.0142, 52.2479)", order: "(x, y) = (lng, lat)" },
  { where: "Leaflet", code: "L.latLng(52.2479, 21.0142)", order: "[lat, lng]" },
  { where: "This API", code: "?lat=52.2479&lng=21.0142", order: "named, so it cannot be swapped" },
] as const;

export function AxisOrderPitfall() {
  return (
    <>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Where</th>
              <th>Royal Castle, Warsaw</th>
              <th>Order</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.where}>
                <td>{r.where}</td>
                <td>
                  <code>{r.code}</code>
                </td>
                <td>{r.order}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Swap them and <code>52.2479, 21.0142</code> read as lng/lat is a point in the Arabian
        Peninsula&apos;s Empty Quarter. Both numbers are valid coordinates, so range checks cannot
        catch it. The app keeps points as <code>{"{ lat, lng }"}</code> objects and only turns them
        into arrays in <code>features/map/utils/coords.ts</code>, the one place that knows both
        conventions.
      </p>
      <p>
        Projected systems have the same trap. The two services this project downloads from both
        publish EPSG:2180, yet the GDOŚ request (WFS 1.0) takes its bounding box as easting,northing
        and the NID request (WFS 2.0, which follows the EPSG definition) as northing,easting. See{" "}
        <code>scripts/lib/sources.ts</code>.
      </p>
    </>
  );
}
