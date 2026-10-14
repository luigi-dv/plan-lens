"use client";

import { useState, type FormEvent } from "react";
import { useFetchJson } from "@/shared/hooks/useFetchJson";
import type { CrsPointResult, CrsResponse } from "../types/crs";
import styles from "./Crs.module.css";

// The Royal Castle in Warsaw, and a point 0.01° of longitude due east of it.
const DEFAULTS = { latA: "52.2479", lngA: "21.0142", latB: "52.2479", lngB: "21.0242" };
type Draft = typeof DEFAULTS;

const nf = (digits: number) =>
  new Intl.NumberFormat("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function toQuery(draft: Draft) {
  return new URLSearchParams(draft).toString();
}

function offsetB(draft: Draft, dLat: number, dLng: number): Draft {
  return {
    ...draft,
    latB: String(+(Number(draft.latA) + dLat).toFixed(6)),
    lngB: String(+(Number(draft.lngA) + dLng).toFixed(6)),
  };
}

function PointRows({ label, point }: { label: string; point: CrsPointResult }) {
  return (
    <>
      <tr>
        <th scope="row">{label}</th>
        <td>EPSG:4326</td>
        <td>
          {nf(6).format(point.epsg4326.x)}, {nf(6).format(point.epsg4326.y)}
        </td>
        <td>degrees (lng, lat)</td>
      </tr>
      <tr>
        <th scope="row" />
        <td>EPSG:3857</td>
        <td>
          {nf(1).format(point.epsg3857.x)}, {nf(1).format(point.epsg3857.y)}
        </td>
        <td>metres (x, y)</td>
      </tr>
      <tr>
        <th scope="row" />
        <td>EPSG:2180</td>
        <td>
          {nf(1).format(point.epsg2180.x)}, {nf(1).format(point.epsg2180.y)}
        </td>
        <td>metres (easting, northing)*</td>
      </tr>
    </>
  );
}

function Results({ data }: { data: CrsResponse }) {
  const truth = data.distance.geographyM;
  const methods = [
    {
      label: "ST_Distance on EPSG:4326 geometry",
      value: `${nf(6).format(data.distance.degrees)} °`,
      note: "A number in degrees. Not a length.",
      error: null,
    },
    {
      label: "ST_Distance on ::geography",
      value: `${nf(1).format(truth)} m`,
      note: "Metres on the WGS84 ellipsoid. Reference value.",
      error: 0,
    },
    {
      label: "ST_Distance after ST_Transform to 2180",
      value: `${nf(1).format(data.distance.puwg2180M)} m`,
      note: "Metres on Poland's national grid. Used for areas here.",
      error: (data.distance.puwg2180M - truth) / truth,
    },
    {
      label: "ST_Distance after ST_Transform to 3857",
      value: `${nf(1).format(data.distance.webMercator3857M)} m`,
      note: "Mercator-stretched. Wrong on the ground.",
      error: (data.distance.webMercator3857M - truth) / truth,
    },
  ];

  return (
    <>
      <h3 className={styles.h3}>Same points, three coordinate systems</h3>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th />
              <th>CRS</th>
              <th>Coordinates</th>
              <th>Units</th>
            </tr>
          </thead>
          <tbody>
            <PointRows label="A" point={data.a} />
            <PointRows label="B" point={data.b} />
          </tbody>
        </table>
      </div>
      <p className={styles.footnote}>
        * <code>ST_X</code> / <code>ST_Y</code> always return easting / northing. The EPSG definition of
        2180, though, lists northing first, and services that follow it (WFS 2.0, GML) write{" "}
        <code>{nf(0).format(data.a.epsg2180.y)} {nf(0).format(data.a.epsg2180.x)}</code>. Same point,
        axes swapped.
      </p>

      <h3 className={styles.h3}>Distance from A to B, measured four ways</h3>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Method</th>
              <th>Result</th>
              <th>vs geography</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.label}>
                <td>
                  <code>{m.label}</code>
                </td>
                <td className={styles.num}>{m.value}</td>
                <td className={styles.num}>
                  {m.error === null
                    ? "n/a"
                    : `${m.error >= 0 ? "+" : ""}${nf(2).format(m.error * 100)} %`}
                </td>
                <td>{m.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className={styles.sql}>
        <summary>The SQL that produced this</summary>
        <pre>{data.sql}</pre>
      </details>
    </>
  );
}

export function CrsExplorer() {
  const [draft, setDraft] = useState<Draft>(DEFAULTS);
  const [committed, setCommitted] = useState<Draft>(DEFAULTS);
  const { data, error, loading } = useFetchJson<CrsResponse>(`/api/crs?${toQuery(committed)}`);

  function submit(event: FormEvent) {
    event.preventDefault();
    setCommitted(draft);
  }

  function preset(next: Draft) {
    setDraft(next);
    setCommitted(next);
  }

  const field = (key: keyof Draft, label: string) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        required
      />
    </label>
  );

  return (
    <div>
      <form onSubmit={submit} className={styles.form}>
        <div className={styles.pair}>
          <span className={styles.pairLabel}>Point A</span>
          {field("latA", "Latitude")}
          {field("lngA", "Longitude")}
        </div>
        <div className={styles.pair}>
          <span className={styles.pairLabel}>Point B</span>
          {field("latB", "Latitude")}
          {field("lngB", "Longitude")}
        </div>
        <div className={styles.actions}>
          <button type="submit">Transform</button>
          <button type="button" onClick={() => preset(offsetB(draft, 0, 0.01))}>
            B = 0.01° east of A
          </button>
          <button type="button" onClick={() => preset(offsetB(draft, 0.01, 0))}>
            B = 0.01° north of A
          </button>
        </div>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading && !data ? <p className={styles.muted}>Running ST_Transform…</p> : null}
      {data ? <Results data={data} /> : null}
    </div>
  );
}
