import type { LatLng } from "@/shared/types/geo";
import type { ConstraintLookup } from "../hooks/useConstraintLookup";
import { ConstraintItem } from "./ConstraintItem";
import styles from "./ResultsPanel.module.css";

interface Props {
  point: LatLng | null;
  radiusM: number;
  lookup: ConstraintLookup;
}

export function ResultsPanel({ point, radiusM, lookup }: Props) {
  const { inside, nearby } = lookup;

  if (!point) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Click anywhere on the map</p>
        <p>
          You will see the planning constraints that cover that point, plus anything within the
          chosen radius. Areas are measured in Poland&apos;s national grid (EPSG:2180), distances
          on the ellipsoid, both in metres.
        </p>
      </div>
    );
  }

  const insideHits = inside.data?.constraints ?? [];
  const insideIds = new Set(insideHits.map((h) => h.id));
  const nearbyHits = (nearby.data?.constraints ?? []).filter((h) => !insideIds.has(h.id));
  const error = inside.error ?? nearby.error;

  return (
    <div className={styles.panel} aria-live="polite">
      <div className={styles.point}>
        <span className={styles.label}>Selected point (EPSG:4326)</span>
        <code>
          {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </code>
        {inside.elapsedMs !== undefined ? (
          <span className={styles.timing}>
            point lookup {Math.round(inside.elapsedMs)} ms
            {nearby.elapsedMs !== undefined ? ` · nearby ${Math.round(nearby.elapsedMs)} ms` : ""}
          </span>
        ) : null}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section>
        <h2 className={styles.heading}>
          At this point
          {inside.data ? <span className={styles.count}>{insideHits.length}</span> : null}
        </h2>
        {inside.loading ? <p className={styles.muted}>Searching…</p> : null}
        {inside.data && insideHits.length === 0 ? (
          <p className={styles.muted}>No constraints cover this point.</p>
        ) : null}
        <ul className={styles.list}>
          {insideHits.map((hit) => (
            <ConstraintItem key={hit.id} hit={hit} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className={styles.heading}>
          Within {radiusM.toLocaleString("en-GB")} m
          {nearby.data ? <span className={styles.count}>{nearbyHits.length}</span> : null}
        </h2>
        {nearby.loading ? <p className={styles.muted}>Searching…</p> : null}
        {nearby.data && nearbyHits.length === 0 ? (
          <p className={styles.muted}>Nothing else within this radius.</p>
        ) : null}
        <ul className={styles.list}>
          {nearbyHits.map((hit) => (
            <ConstraintItem key={hit.id} hit={hit} />
          ))}
        </ul>
      </section>
    </div>
  );
}
