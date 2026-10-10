"use client";

import { useEffect, useState } from "react";

interface Settled<T> {
  url: string;
  data?: T;
  error?: string;
  /** Round-trip time in milliseconds, measured in the browser. */
  elapsedMs: number;
}

export interface FetchJsonState<T> {
  /** Data for the *current* url; undefined while it is loading or after an error. */
  data: T | undefined;
  /** The most recent successful data for any url (keeps the old result on screen while refetching). */
  lastData: T | undefined;
  /** The url `lastData` was fetched from; usable as a React key. */
  lastDataUrl: string | undefined;
  error: string | undefined;
  loading: boolean;
  elapsedMs: number | undefined;
}

/**
 * GET `url` as JSON whenever it changes; `null` means "do nothing". In-flight requests are
 * aborted when the url changes, so a slow earlier response can never overwrite a newer one.
 * State is only set from the async callbacks, never synchronously in the effect.
 */
export function useFetchJson<T>(url: string | null): FetchJsonState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [last, setLast] = useState<{ url: string; data: T } | null>(null);

  useEffect(() => {
    if (url === null) return;
    const controller = new AbortController();
    const started = performance.now();

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message = (body as { error?: string } | null)?.error;
          throw new Error(message ?? `Request failed (${response.status})`);
        }
        const elapsedMs = performance.now() - started;
        setSettled({ url, data: body as T, elapsedMs });
        setLast({ url, data: body as T });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Request failed";
        setSettled({ url, error: message, elapsedMs: performance.now() - started });
      });

    return () => controller.abort();
  }, [url]);

  const current = url !== null && settled?.url === url ? settled : null;
  return {
    data: current?.data,
    lastData: last?.data,
    lastDataUrl: last?.url,
    error: current?.error,
    loading: url !== null && current === null,
    elapsedMs: current?.elapsedMs,
  };
}
