import { datasetInfo } from "../types/datasets";
import type { ConstraintHit } from "../types/constraint";
import { formatArea, formatDistance } from "../utils/format";
import styles from "./ConstraintItem.module.css";

export function ConstraintItem({ hit }: { hit: ConstraintHit }) {
  const dataset = datasetInfo(hit.dataset);
  return (
    <li className={styles.item}>
      <div className={styles.top}>
        <span className={styles.swatch} style={{ background: dataset?.color ?? "#64748b" }} aria-hidden />
        <span className={styles.name}>{hit.name}</span>
      </div>
      <div className={styles.dataset}>
        {dataset ? `${dataset.label} · ${dataset.labelPl}` : hit.dataset}
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Area</dt>
          <dd>{formatArea(hit.areaM2)}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{formatDistance(hit.distanceM)}</dd>
        </div>
      </dl>
      {hit.documentationUrl ? (
        <a className={styles.doc} href={hit.documentationUrl} target="_blank" rel="noreferrer">
          Official record
        </a>
      ) : null}
    </li>
  );
}
