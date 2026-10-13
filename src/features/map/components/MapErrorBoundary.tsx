"use client";

import { Component, type ReactNode } from "react";
import styles from "./MapErrorBoundary.module.css";

interface State {
  error: Error | null;
}

/**
 * Leaflet throws from inside react-leaflet's render/effects (bad icon options, invalid
 * coordinates, …). Without a boundary that unmounts the whole page; with it, only the map
 * pane shows the error and the rest of the UI keeps working.
 */
export class MapErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[map]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.fallback} role="alert">
        <p className={styles.title}>The map failed to load</p>
        <p className={styles.message}>{this.state.error.message}</p>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
