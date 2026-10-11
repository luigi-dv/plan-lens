import { DATASETS } from "@/features/constraints/types/datasets";
import styles from "./Controls.module.css";

interface Props {
  selected: readonly string[];
  onChange: (next: string[]) => void;
}

export function LayerToggle({ selected, onChange }: Props) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Layers</legend>
      {DATASETS.map((dataset) => (
        <label key={dataset.id} className={styles.check} title={dataset.labelPl}>
          <input
            type="checkbox"
            checked={selected.includes(dataset.id)}
            onChange={() => toggle(dataset.id)}
          />
          <span className={styles.swatch} style={{ background: dataset.color }} aria-hidden />
          {dataset.label}
        </label>
      ))}
    </fieldset>
  );
}
