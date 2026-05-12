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
  ExternalLink,
  Sparkles,
  BarChart3,
  Building2,
} from "lucide-react";
import type { EtfMeta } from "@/lib/etf-library";
import SourceLink from "@/components/SourceLink";

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
      <div className="flex items-center justify-center py-32 text-[color:var(--muted)]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading {ticker}...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="surface p-5" style={{ background: "var(--negative-tint)" }}>
        <AlertTriangle className="h-5 w-5 mb-2" style={{ color: "var(--negative)" }} />
        <p className="font-semibold" style={{ color: "var(--negative)" }}>
          Unable to load {ticker}
        </p>
        <p className="text-xs text-[color:var(--muted)] mt-1">{error}</p>
        <Link href="/etfs" className="btn btn-ghost btn-sm mt-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to library
        </Link>
      </div>
    );
  }
  const { meta, quote, chainSummary, underlyingPrice } = data;
  const issuerSource = meta.sources.find((s) => s.category === "issuer");

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href="/etfs"
        className="text-[12px] font-semibold inline-flex items-center gap-1 mb-4"
        style={{ color: "var(--accent)" }}
      >
        <ArrowLeft className="h-3 w-3" /> All ETFs
      </Link>

      {/* === APPLE-STYLE HERO === */}
      <section className="text-center md:py-12 py-6 mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="pill pill-outline capitalize">{meta.primary_fuel}</span>
          <span className="pill pill-accent">Series 65/66 eligible</span>
          <span className="text-[11px] text-[color:var(--muted-2)] font-mono">
            verified {meta.last_verified}
          </span>
        </div>
        <p
          className="ticker text-[18px] font-bold tracking-[0.18em] mb-2"
          style={{ color: "var(--accent-lo)" }}
        >
          {meta.ticker}
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.02] mb-4">
          {meta.name}
        </h1>
        <p className="text-[15px] md:text-[18px] text-[color:var(--muted)] max-w-2xl mx-auto leading-relaxed">
          {meta.issuer} · inception {meta.inception} · trades on {meta.underlying_exchange}
        </p>
        {quote && (
          <div className="inline-flex items-baseline gap-3 mt-7">
            <p className="text-num text-[48px] md:text-[64px] font-bold tracking-tight">
              ${quote.price.toFixed(2)}
            </p>
            <p
              className="text-num text-[16px] md:text-[18px] font-semibold flex items-center gap-1.5"
              style={{
                color: quote.changePct >= 0 ? "var(--positive)" : "var(--negative)",
              }}
            >
              {quote.changePct >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {quote.change >= 0 ? "+" : ""}
              {quote.change.toFixed(2)} ({quote.changePct >= 0 ? "+" : ""}
              {quote.changePct.toFixed(2)}%)
            </p>
          </div>
        )}
        {quote && (
          <p className="text-[11px] text-[color:var(--muted-2)] mt-2">
            Prev close ${quote.previousClose.toFixed(2)} ·{" "}
            <span className="font-mono">{new Date(quote.asOf).toLocaleString()}</span> ·{" "}
            <SourceLink
              sources={[{ label: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${ticker}/` }]}
              label="Yahoo Finance"
            />
          </p>
        )}
      </section>

      {/* === KPI strip (Bloomberg-style density) === */}
      <section className="mb-10">
        <h2 className="h-section mb-3">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            accent="accent"
            label="Expense Ratio"
            value={`${(meta.expense_ratio * 100).toFixed(2)}%`}
            sub="Annualized · net to investor"
            sources={meta.sources.filter((s) => s.category === "issuer" || s.category === "data-vendor").slice(0, 2)}
            source_label="Issuer"
          />
          <Kpi
            accent="teal"
            label="AUM"
            value={`$${meta.aum_millions.toLocaleString()}M`}
            sub={`As of ${meta.last_verified}`}
            sources={meta.sources.filter((s) => s.category === "data-vendor").slice(0, 1)}
            source_label="Vendor"
          />
          <Kpi
            accent="positive"
            label="Correlation · Retail"
            value={`${(meta.correlation_to_retail * 100).toFixed(0)}%`}
            sub="24-month rolling · modeled"
            sources={[{ label: "EIA retail prices", url: "https://www.eia.gov/petroleum/gasdiesel/" }]}
            source_label="EIA"
            modeled
          />
          <Kpi
            accent="ink"
            label="Avg Daily Volume"
            value={`${meta.avg_daily_volume_thousands.toLocaleString()}K`}
            sub="Shares · 30-day average"
            sources={[
              { label: "ETF.com", url: `https://www.etf.com/${ticker}` },
              { label: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${ticker}/` },
            ]}
          />
        </div>
      </section>

      {/* === Profile + Structure (Apple two-up layout) === */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <div className="surface p-7 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="h-section">Profile</h2>
            {issuerSource && (
              <a
                href={issuerSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold inline-flex items-center gap-1 hover:underline underline-offset-2"
                style={{ color: "var(--accent)" }}
              >
                Read the prospectus <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-[15px] text-[color:var(--ink-2)] leading-relaxed">
            {meta.description}
          </p>
        </div>
        <div className="surface p-7">
          <h2 className="h-section mb-4">Structure</h2>
          <dl className="space-y-3 text-[13px]">
            <Row label="Structure" value={meta.structure} />
            <Row label="Tax Form" value={meta.tax_form} />
            <Row label="Underlying" value={meta.underlying} />
            <Row label="Exchange" value={meta.underlying_exchange} />
            <Row label="Liquidity" value={meta.liquidity_class} />
            <Row label="Options" value={meta.options_available ? "Yes (listed equity options)" : "No"} />
            <Row label="Default IV" value={`${(meta.default_iv * 100).toFixed(0)}%`} note="modeled" />
            <Row label="Weekly Drag" value={`${(meta.weekly_decay_pct * 100).toFixed(2)}%`} note="contango est." />
          </dl>
        </div>
      </section>

      {/* === Bloomberg-density "Why this matters" strip === */}
      <section className="surface-deep p-7 md:p-9 mb-10" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/45 mb-2">
              Primary fuel
            </p>
            <p className="font-display text-[24px] font-bold text-white capitalize">
              {meta.primary_fuel}
            </p>
            <p className="text-[12px] text-white/55 mt-1.5 leading-relaxed">
              Direct exposure to {meta.primary_fuel} prices through {meta.underlying}.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/45 mb-2">
              Issuer
            </p>
            <p className="font-display text-[24px] font-bold text-white">{meta.issuer}</p>
            <p className="text-[12px] text-white/55 mt-1.5 leading-relaxed">
              Founded 2005 · 4 commodity ETFs · regulated under the Securities Act of 1933.
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/45 mb-2">
              Options open interest
            </p>
            <p className="font-display text-[24px] font-bold text-white">{meta.options_avg_oi.split(" ")[0]}</p>
            <p className="text-[12px] text-white/55 mt-1.5 leading-relaxed">
              {meta.options_avg_oi}
            </p>
          </div>
        </div>
      </section>

      {/* === Best for / Risks (Apple side-by-side) === */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="surface p-7" style={{ background: "var(--positive-tint)" }}>
          <h2 className="h-section mb-4 flex items-center gap-1.5" style={{ color: "var(--positive)" }}>
            <ShieldCheck className="h-3.5 w-3.5" /> Best For
          </h2>
          <ul className="space-y-3">
            {meta.best_for.map((b, i) => (
              <li
                key={i}
                className="text-[14px] text-[color:var(--ink-2)] flex items-start gap-2.5 leading-relaxed"
              >
                <CheckCircle2
                  className="h-4 w-4 mt-0.5 shrink-0"
                  style={{ color: "var(--positive)" }}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface p-7" style={{ background: "var(--warning-tint)" }}>
          <h2 className="h-section mb-4 flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
            <AlertTriangle className="h-3.5 w-3.5" /> Risks &amp; Tradeoffs
          </h2>
          <ul className="space-y-3">
            {meta.risks.map((r, i) => (
              <li
                key={i}
                className="text-[14px] text-[color:var(--ink-2)] flex items-start gap-2.5 leading-relaxed"
              >
                <AlertTriangle
                  className="h-4 w-4 mt-0.5 shrink-0"
                  style={{ color: "var(--warning)" }}
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* === Live options chain (Bloomberg-dense table) === */}
      <section className="surface mb-8" style={{ padding: 0, overflow: "hidden" }}>
        <div className="px-7 pt-6 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="h-section flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Live Options Chain
            </h2>
            <p className="text-[11px] text-[color:var(--muted-2)] mt-0.5">
              ATM mids · Implied volatility · Next 6 expirations
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            {underlyingPrice && (
              <span className="text-[color:var(--muted)]">
                Underlying{" "}
                <span className="text-num font-bold text-[color:var(--ink)]">
                  ${underlyingPrice.toFixed(2)}
                </span>
              </span>
            )}
            <span className="font-mono text-[color:var(--muted-2)]">
              {new Date(data.as_of).toLocaleTimeString()}
            </span>
            <SourceLink
              sources={[{ label: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${ticker}/options` }]}
              label="Yahoo"
            />
          </div>
        </div>
        {chainSummary.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)] px-7 pb-7">
            No live chain available from Yahoo right now. Falls back to default IV (
            {(meta.default_iv * 100).toFixed(0)}%) for pricing.
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
      </section>

      {/* === Sources panel === */}
      <section className="surface p-6 mb-10" style={{ background: "var(--bg)" }}>
        <h2 className="h-section mb-4 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Sources for this page
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {meta.sources.map((s, i) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-[color:var(--bg-elev)] transition-colors group"
            >
              <span
                className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[color:var(--ink-2)] group-hover:text-[color:var(--accent)] truncate">
                  {s.label}
                </p>
                <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">
                  {s.verifies}
                </p>
              </div>
              <ExternalLink className="h-3 w-3 text-[color:var(--muted-2)] mt-1 shrink-0" />
            </a>
          ))}
        </div>
        <Link
          href="/sources"
          className="inline-flex items-center gap-1 text-[12px] font-semibold mt-3"
          style={{ color: "var(--accent)" }}
        >
          <Sparkles className="h-3 w-3" /> Full sources &amp; methodology
        </Link>
      </section>

      <p className="text-[11px] text-[color:var(--muted-2)] mb-10 leading-relaxed text-center">
        <Building2 className="h-3 w-3 inline mr-1" />
        <strong className="text-[color:var(--ink-2)]">Reference data point-in-time.</strong>{" "}
        Verified {meta.last_verified}. Live data (quotes, options chain) refreshes on each page
        load. Modeled values (correlation, IV, decay) are estimates &mdash; always confirm in the
        client&apos;s brokerage before executing.
      </p>
    </div>
  );
}

function Kpi({
  accent,
  label,
  value,
  sub,
  sources,
  source_label,
  modeled,
}: {
  accent: "accent" | "teal" | "positive" | "ink";
  label: string;
  value: string;
  sub: string;
  sources?: { label: string; url: string }[];
  source_label?: string;
  modeled?: boolean;
}) {
  return (
    <div className={`kpi kpi-${accent}`}>
      <div className="flex items-start justify-between">
        <div className="kpi-label">{label}</div>
        {modeled && <span className="pill pill-warning text-[9px] py-0">Modeled</span>}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
      {sources && sources.length > 0 && (
        <div className="mt-2">
          <SourceLink sources={sources} label={source_label ?? "Source"} compact />
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex justify-between gap-3 items-baseline">
      <dt className="text-[color:var(--muted)] text-[12px]">{label}</dt>
      <dd className="text-[color:var(--ink)] text-[12px] font-semibold text-right">
        {value}
        {note && (
          <span className="text-[10px] text-[color:var(--muted-2)] font-normal italic ml-1">
            ({note})
          </span>
        )}
      </dd>
    </div>
  );
}
