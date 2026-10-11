import { MAX_RADIUS_M, MIN_RADIUS_M } from "../types/map";
import styles from "./Controls.module.css";

interface Props {
  value: number;
  onChange: (next: number) => void;
}

export function RadiusSlider({ value, onChange }: Props) {
  return (
    <div className={styles.group}>
      <label className={styles.legend} htmlFor="radius">
        Search radius <output className={styles.output}>{value.toLocaleString("en-GB")} m</output>
      </label>
      <input
        id="radius"
        type="range"
        min={MIN_RADIUS_M}
        max={MAX_RADIUS_M}
        step={50}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={styles.range}
      />
    </div>
  );
}
