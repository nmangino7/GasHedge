import type { DataSourceKind } from "@/services/provenance";

const STYLES: Record<DataSourceKind, { bg: string; fg: string; dot: string; label: string }> = {
  live: { bg: "rgba(16,185,129,0.12)", fg: "#047857", dot: "#10b981", label: "Live" },
  cached: { bg: "rgba(56,189,248,0.12)", fg: "#0369a1", dot: "#38bdf8", label: "Recent" },
  fallback: { bg: "rgba(245,158,11,0.14)", fg: "#b45309", dot: "#f59e0b", label: "Estimated" },
};

export interface ProvenanceBadgeProps {
  source: DataSourceKind;
  provider?: string;
  asOf?: string;
  title?: string;
}

/** Small pill that shows whether a value is live, recent, or a fallback estimate. */
export default function ProvenanceBadge({ source, provider, asOf, title }: ProvenanceBadgeProps) {
  const s = STYLES[source];
  const hint =
    title ??
    (source === "fallback"
      ? "Estimated value — add the relevant API key for live data."
      : `${s.label}${provider ? ` from ${provider}` : ""}${asOf ? ` · ${asOf}` : ""}`);
  return (
    <span
      title={hint}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, display: "inline-block" }} />
      {s.label}
      {provider ? ` · ${provider}` : ""}
    </span>
  );
}
