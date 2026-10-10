"use client";

import dynamic from "next/dynamic";
import styles from "./MapClient.module.css";

/** Leaflet touches `window` on import, so the map is only ever loaded in the browser. */
export const MapClient = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading map…</div>,
});
