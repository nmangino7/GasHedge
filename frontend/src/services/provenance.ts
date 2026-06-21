// Data provenance — every externally-sourced value carries where it came from
// and whether it's live, so the UI can badge "Live · EIA · 2m ago" vs
// "Estimated · fallback" instead of silently showing made-up defaults.

export type DataSourceKind = "live" | "cached" | "fallback";

export interface Provenance {
  source: DataSourceKind;
  /** Human label, e.g. "EIA", "Yahoo Finance", "fallback estimate". */
  provider: string;
  /** ISO timestamp the value was obtained / is valid as of. */
  asOf: string;
  /** Optional short note shown on hover (e.g. why we fell back). */
  note?: string;
}

export interface Sourced<T> {
  value: T;
  provenance: Provenance;
}

export function sourced<T>(
  value: T,
  source: DataSourceKind,
  provider: string,
  note?: string
): Sourced<T> {
  return { value, provenance: { source, provider, asOf: new Date().toISOString(), note } };
}

/** True only if every input value is live. */
export function allLive(...ps: Provenance[]): boolean {
  return ps.every((p) => p.source === "live");
}

/** Worst-case rollup: fallback beats cached beats live. */
export function rollup(...ps: Provenance[]): DataSourceKind {
  if (ps.some((p) => p.source === "fallback")) return "fallback";
  if (ps.some((p) => p.source === "cached")) return "cached";
  return "live";
}
