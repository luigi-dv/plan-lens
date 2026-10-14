import type { Metadata } from "next";
import { AxisOrderPitfall } from "@/features/crs/components/AxisOrderPitfall";
import { CrsExplorer } from "@/features/crs/components/CrsExplorer";
import { CrsSystemsTable } from "@/features/crs/components/CrsSystemsTable";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Coordinate systems | PlanLens",
  description: "EPSG:4326 vs 3857 vs 2180, ST_Transform, and why you do not measure in degrees.",
};

export default function CrsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <h1>Coordinate systems</h1>
        <p className={styles.lead}>
          The same point has different numbers in different coordinate reference systems (CRS). Pick
          the wrong one for the job and distances and areas come out wrong, quietly.
        </p>

        <h2>Three systems in this project</h2>
        <CrsSystemsTable />

        <h2>Try it: ST_Transform and distance</h2>
        <p>
          Enter two points. The database transforms them with <code>ST_Transform</code> and measures
          the gap four ways. Try the two presets: 0.01° east is about 680 m here but 0.01° north is
          about 1,110 m, so <strong>a degree is not a unit of length</strong>.
        </p>
        <CrsExplorer />

        <h2>Why measure in 2180 or geography, not degrees</h2>
        <ul>
          <li>
            The source data arrives in <strong>EPSG:2180</strong> and is reprojected once, on
            import, to <strong>EPSG:4326</strong>: the CRS GeoJSON, GPS and Leaflet&apos;s API speak.
            <code>ST_Area</code> and <code>ST_Distance</code> on 4326 return square degrees and
            degrees.
          </li>
          <li>
            <strong>Distances</strong> use <code>geometry::geography</code>, which measures in
            metres on the WGS84 ellipsoid and is correct anywhere.
          </li>
          <li>
            <strong>Areas</strong> use <code>ST_Area(ST_Transform(geom, 2180))</code>: a projected,
            metric CRS designed for Poland, so m² are close to ground truth (within about 0.1 % in
            Warsaw).
          </li>
          <li>
            <strong>Web Mercator (3857)</strong> is for drawing, not measuring. Leaflet draws on it;
            the database never measures in it.
          </li>
        </ul>

        <h2>The lon/lat vs lat/lon pitfall</h2>
        <AxisOrderPitfall />
      </article>
    </main>
  );
}
