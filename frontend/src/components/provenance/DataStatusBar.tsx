"use client";
import { useEffect, useState } from "react";
import ProvenanceBadge from "./ProvenanceBadge";
import type { DataSourceKind } from "@/services/provenance";

interface Src {
  value: number;
  source: DataSourceKind;
  provider: string;
  asOf: string;
  note?: string;
}
interface DataHealth {
  overall: DataSourceKind;
  sources: { fuel: { gasoline: Src; diesel: Src }; etf: Src & { ticker: string } };
}

/** Compact "where is this data coming from" bar for the dashboard. */
export default function DataStatusBar() {
  const [health, setHealth] = useState<DataHealth | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/health/data")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.ok) setHealth(j.data as DataHealth);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!health) return null;
  const fuel = health.sources.fuel.gasoline;
  const etf = health.sources.etf;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: "var(--muted)" }}>
      <span className="font-semibold uppercase tracking-wider text-[11px]">Data sources:</span>
      <span className="inline-flex items-center gap-1.5">
        Fuel <ProvenanceBadge source={fuel.source} provider={fuel.provider} asOf={fuel.asOf} title={fuel.note} />
      </span>
      <span className="inline-flex items-center gap-1.5">
        ETF <ProvenanceBadge source={etf.source} provider={etf.provider} asOf={etf.asOf} title={etf.note} />
      </span>
      {fuel.source === "fallback" && (
        <span style={{ color: "var(--muted)" }}>· add an EIA key for live fuel prices</span>
      )}
    </div>
  );
}
