import styles from "./Crs.module.css";

const SYSTEMS = [
  {
    epsg: "EPSG:4326",
    name: "WGS84 longitude / latitude",
    unit: "degrees",
    use: "GPS and GeoJSON. How this project stores geometry, after reprojecting the source data on import.",
    caveat: "A degree of longitude is shorter than a degree of latitude, and shrinks towards the poles.",
  },
  {
    epsg: "EPSG:3857",
    name: "Web Mercator",
    unit: "metres (on a stretched sphere)",
    use: "How OpenStreetMap tiles and Leaflet draw the map on screen.",
    caveat: "Distances and areas are inflated by 1/cos(latitude): about 1.6× in length and 2.7× in area in Warsaw.",
  },
  {
    epsg: "EPSG:2180",
    name: "PUWG 1992 (ETRF2000-PL / CS92)",
    unit: "metres (easting / northing)",
    use: "Poland's national grid. What GDOŚ and NID publish the source data in, and where this project measures area.",
    caveat: "Only meant for Poland. Its official axis order is northing first, which some services follow and others don't.",
  },
] as const;

export function CrsSystemsTable() {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>CRS</th>
            <th>Units</th>
            <th>Used for</th>
            <th>Watch out</th>
          </tr>
        </thead>
        <tbody>
          {SYSTEMS.map((s) => (
            <tr key={s.epsg}>
              <td>
                <strong>{s.epsg}</strong>
                <br />
                <span className={styles.muted}>{s.name}</span>
              </td>
              <td>{s.unit}</td>
              <td>{s.use}</td>
              <td>{s.caveat}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
