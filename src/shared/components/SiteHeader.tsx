import Link from "next/link";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        PlanLens
      </Link>
      <nav className={styles.nav} aria-label="Main">
        <Link href="/">Map</Link>
        <Link href="/crs">Coordinate systems</Link>
      </nav>
    </header>
  );
}
