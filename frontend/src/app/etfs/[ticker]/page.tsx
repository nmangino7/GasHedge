"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Activity,
} from "lucide-react";
import type { EtfMeta } from "@/lib/etf-library";

interface ChainSummaryRow {
  expirationDate: string;
  daysToExpiry: number;
  callCount: number;
  putCount: number;
  atmCallMid: number | null;
  atmPutMid: number | null;
  atmIv: number | null;
}

interface EtfDetailResponse {
  meta: EtfMeta;
  quote: {
    price: number;
    change: number;
    changePct: number;
    previousClose: number;
    asOf: string;
  } | null;
  chainSummary: ChainSummaryRow[];
  underlyingPrice: number | null;
  expirationCount: number;
  as_of: string;
}

export default function EtfDetailPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();
  const [data, setData] = useState<EtfDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/etfs/${ticker}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
        return r.json() as Promise<EtfDetailResponse>;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[color:var(--muted)]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading {ticker}...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="surface p-5" style={{ background: "var(--negative-tint)" }}>
        <AlertTriangle className="h-5 w-5 mb-2" style={{ color: "var(--negative)" }} />
        <p className="font-semibold" style={{ color: "var(--negative)" }}>Unable to load {ticker}</p>
        <p className="text-xs text-[color:var(--muted)] mt-1">{error}</p>
        <Link href="/etfs" className="btn btn-ghost btn-sm mt-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to library
        </Link>
      </div>
    );
  }
  const { meta, quote, chainSummary, underlyingPrice } = data;

  return (
    <div>
      <Link
        href="/etfs"
        className="text-[12px] font-semibold inline-flex items-center gap-1 mb-3"
        style={{ color: "var(--accent)" }}
      >
        <ArrowLeft className="h-3 w-3" /> All ETFs
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="ticker text-[28px] font-bold text-[color:var(--ink)]">
              {meta.ticker}
            </span>
            <span className="pill pill-outline capitalize">{meta.primary_fuel}</span>
            <span className="pill pill-accent">Series 65/66</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{meta.name}</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            {meta.issuer} · inception {meta.inception} · {meta.underlying_exchange}
          </p>
        </div>
        {quote && (
          <div className="surface p-5 min-w-[230px]">
            <p className="kpi-label">Live Quote</p>
            <p className="text-num text-[32px] font-bold">${quote.price.toFixed(2)}</p>
            <p
              className="text-num text-[13px] font-semibold flex items-center gap-1.5 mt-1"
              style={{ color: quote.changePct >= 0 ? "var(--positive)" : "var(--negative)" }}
            >
              {quote.changePct >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {quote.change >= 0 ? "+" : ""}
              {quote.change.toFixed(2)} ({quote.changePct >= 0 ? "+" : ""}
              {quote.changePct.toFixed(2)}%)
            </p>
            <p className="text-[10px] text-[color:var(--muted-2)] mt-2">
              Prev close ${quote.previousClose.toFixed(2)} · {new Date(quote.asOf).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi accent="accent" label="Expense Ratio" value={`${(meta.expense_ratio * 100).toFixed(2)}%`} sub="annualized" />
        <Kpi accent="teal" label="AUM" value={`$${meta.aum_millions}M`} sub="approx" />
        <Kpi accent="positive" label="Correlation to Retail" value={`${(meta.correlation_to_retail * 100).toFixed(0)}%`} sub="24-month rolling" />
        <Kpi accent="ink" label="Avg Daily Volume" value={`${meta.avg_daily_volume_thousands.toLocaleString()}K`} sub="shares" />
      </div>

      {/* Profile + structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="surface p-5 lg:col-span-2">
          <h2 className="h-section mb-3">Profile</h2>
          <p className="text-[13px] text-[color:var(--ink-2)] leading-relaxed">{meta.description}</p>
        </div>
        <div className="surface p-5">
          <h2 className="h-section mb-3">Structure</h2>
          <div className="space-y-2 text-[13px]">
            <Row label="Structure" value={meta.structure} />
            <Row label="Tax Form" value={meta.tax_form} />
            <Row label="Underlying" value={meta.underlying_exchange} />
            <Row label="Liquidity" value={meta.liquidity_class} />
            <Row label="Options" value={meta.options_available ? "Yes" : "No"} />
            <Row label="Default IV" value={`${(meta.default_iv * 100).toFixed(0)}%`} />
          </div>
        </div>
      </div>

      {/* Best for / Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="surface p-5" style={{ background: "var(--positive-tint)" }}>
          <h2 className="h-section mb-3 flex items-center gap-1.5" style={{ color: "var(--positive)" }}>
            <ShieldCheck className="h-3.5 w-3.5" /> Best For
          </h2>
          <ul className="space-y-2">
            {meta.best_for.map((b, i) => (
              <li key={i} className="text-[13px] text-[color:var(--ink-2)] flex items-start gap-2">
                <CheckCircle2
                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                  style={{ color: "var(--positive)" }}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface p-5" style={{ background: "var(--warning-tint)" }}>
          <h2 className="h-section mb-3 flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
            <AlertTriangle className="h-3.5 w-3.5" /> Risks & Tradeoffs
          </h2>
          <ul className="space-y-2">
            {meta.risks.map((r, i) => (
              <li key={i} className="text-[13px] text-[color:var(--ink-2)] flex items-start gap-2">
                <AlertTriangle
                  className="h-3.5 w-3.5 mt-0.5 shrink-0"
                  style={{ color: "var(--warning)" }}
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Live options chain summary */}
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="h-section flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Live Options Chain Summary
          </h2>
          <span className="text-[10px] text-[color:var(--muted-2)]">
            ATM mids · IV pulled per expiry · underlying ${underlyingPrice?.toFixed(2) ?? "—"}
          </span>
        </div>
        {chainSummary.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)] px-5 pb-5">
            No live chain available from Yahoo right now. Falls back to default IV ({(meta.default_iv * 100).toFixed(0)}%) for pricing.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Expiry</th>
                  <th className="right">DTE</th>
                  <th className="right">Calls</th>
                  <th className="right">Puts</th>
                  <th className="right">ATM Call Mid</th>
                  <th className="right">ATM Put Mid</th>
                  <th className="right">ATM IV</th>
                </tr>
              </thead>
              <tbody>
                {chainSummary.map((row) => (
                  <tr key={row.expirationDate}>
                    <td className="font-semibold">{row.expirationDate}</td>
                    <td className="right num">{row.daysToExpiry}d</td>
                    <td className="right num">{row.callCount}</td>
                    <td className="right num">{row.putCount}</td>
                    <td className="right num">
                      {row.atmCallMid !== null ? `$${row.atmCallMid.toFixed(2)}` : "—"}
                    </td>
                    <td className="right num">
                      {row.atmPutMid !== null ? `$${row.atmPutMid.toFixed(2)}` : "—"}
                    </td>
                    <td className="right num">
                      {row.atmIv !== null ? `${(row.atmIv * 100).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="surface p-4 mt-6 text-[11px] text-[color:var(--muted)] leading-relaxed">
        <strong className="text-[color:var(--ink-2)]">Modeled values.</strong> Quote and chain data
        delayed up to 15 minutes via Yahoo Finance. Reference data (expense, AUM, structure) sourced
        from issuer filings, snapshot may lag latest fund prospectus. Always confirm strike & premium
        in the client&apos;s brokerage before executing.
      </div>
    </div>
  );
}

function Kpi({
  accent,
  label,
  value,
  sub,
}: {
  accent: "accent" | "teal" | "positive" | "ink";
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={`kpi kpi-${accent}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[color:var(--muted)] text-[12px]">{label}</span>
      <span className="text-[color:var(--ink)] text-[12px] font-semibold text-right truncate">
        {value}
      </span>
    </div>
  );
}
