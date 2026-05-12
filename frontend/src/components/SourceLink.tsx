"use client";
import { ExternalLink } from "lucide-react";

interface Source {
  label: string;
  url: string;
}

interface Props {
  sources: Source[];
  /** Optional override label, e.g. "USCF prospectus" instead of "Source" */
  label?: string;
  compact?: boolean;
}

/**
 * Inline citation chip. Renders one or multiple sources as small links.
 * Use everywhere a data point is shown.
 */
export default function SourceLink({ sources, label, compact = false }: Props) {
  if (sources.length === 0) return null;
  if (sources.length === 1) {
    const s = sources[0];
    return (
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline ${
          compact ? "text-[10px]" : "text-[11px]"
        }`}
        style={{ color: "var(--muted)" }}
        title={s.label}
      >
        <ExternalLink className="h-2.5 w-2.5" />
        {label ?? "Source"}
      </a>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 ${compact ? "text-[10px]" : "text-[11px]"}`}
      style={{ color: "var(--muted)" }}
    >
      <span className="font-medium">{label ?? "Sources"}:</span>
      {sources.map((s, i) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline underline-offset-2"
          style={{ color: "var(--accent-lo)" }}
          title={s.label}
        >
          [{i + 1}]
        </a>
      ))}
    </span>
  );
}
