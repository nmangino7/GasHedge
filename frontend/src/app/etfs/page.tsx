"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type { EtfMeta } from "@/lib/etf-library";
import SourceLink from "@/components/SourceLink";

interface EtfWithQuote extends EtfMeta {
  quote: {
    price: number;
    change: number;
    changePct: number;
    previousClose: number;
    asOf: string;
  } | null;
}

export default function EtfLibraryPage() {
  const [etfs, setEtfs] = useState<EtfWithQuote[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/etfs");
      const data = await res.json();
      setEtfs(data.etfs);
      setAsOf(data.as_of);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* === APPLE-STYLE HERO === */}
      <section className="text-center md:py-12 py-6 mb-10">
        <span className="pill pill-accent inline-flex mb-5">
          <ShieldCheck className="h-3 w-3" />
          Series 65/66 eligible universe
        </span>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.02] mb-4">
          The fuel-hedge ETF library.
        </h1>
        <p className="text-[17px] md:text-[19px] text-[color:var(--muted)] max-w-2xl mx-auto leading-relaxed">
          Four ETFs cover gasoline, crude, Brent, and natural gas — and you can advise on every one
          under your existing license. Live quotes from Yahoo Finance. Issuer data verified against
          USCF prospectus and ETF.com.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5 text-[11px] text-[color:var(--muted-2)] flex-wrap">
          <span>Reference data verified 2026-05-12</span>
          <span>·</span>
          <Link
            href="/sources"
            className="font-semibold hover:underline underline-offset-2"
            style={{ color: "var(--accent)" }}
          >
            Sources &amp; methodology →
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[color:var(--muted)]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading ETFs...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {etfs.map((etf) => (
              <Link
                key={etf.ticker}
                href={`/etfs/${etf.ticker}`}
                className="surface-raised p-7 group flex flex-col"
              >
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="ticker text-[26px] font-bold text-[color:var(--ink)] tracking-tight">
                        {etf.ticker}
                      </span>
                      <span className="pill pill-outline capitalize">{etf.primary_fuel}</span>
                    </div>
                    <h2 className="font-display text-[18px] font-bold tracking-tight text-[color:var(--ink)] group-hover:text-[color:var(--accent)] leading-tight">
                      {etf.name}
                    </h2>
                    <p className="text-[12px] text-[color:var(--muted)] mt-1">
                      {etf.underlying}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {etf.quote ? (
                      <>
                        <p className="text-num text-[26px] font-bold">
                          ${etf.quote.price.toFixed(2)}
                        </p>
                        <p
                          className="text-num text-[12px] font-semibold flex items-center justify-end gap-1"
                          style={{
                            color: etf.quote.changePct >= 0 ? "var(--positive)" : "var(--negative)",
                          }}
                        >
                          {etf.quote.changePct >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {etf.quote.changePct >= 0 ? "+" : ""}
                          {etf.quote.changePct.toFixed(2)}%
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-[color:var(--muted-2)]">Quote unavailable</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <Stat label="Expense" value={`${(etf.expense_ratio * 100).toFixed(2)}%`} />
                  <Stat label="AUM" value={`$${etf.aum_millions.toLocaleString()}M`} />
                  <Stat
                    label="Correlation"
                    value={`${(etf.correlation_to_retail * 100).toFixed(0)}%`}
                  />
                  <Stat
                    label="ADV"
                    value={
                      etf.avg_daily_volume_thousands >= 1000
                        ? `${(etf.avg_daily_volume_thousands / 1000).toFixed(1)}M`
                        : `${etf.avg_daily_volume_thousands}K`
                    }
                  />
                </div>

                <p className="text-[13px] text-[color:var(--ink-2)] leading-relaxed mb-4 line-clamp-3">
                  {etf.description}
                </p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-[color:var(--line)]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`pill ${
                        etf.liquidity_class === "High"
                          ? "pill-positive"
                          : etf.liquidity_class === "Medium"
                          ? "pill-teal"
                          : "pill-warning"
                      }`}
                    >
                      {etf.liquidity_class} liquidity
                    </span>
                    {etf.options_available && <span className="pill pill-accent">Options</span>}
                    <span className="pill pill-outline">{etf.tax_form.split(" ")[0]}</span>
                    <SourceLink
                      sources={etf.sources.slice(0, 2).map((s) => ({ label: s.label, url: s.url }))}
                      label="Sources"
                      compact
                    />
                  </div>
                  <span
                    className="text-[12px] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all"
                    style={{ color: "var(--accent)" }}
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Sources strip */}
          <section className="mt-12 surface p-6" style={{ background: "var(--bg)" }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="h-section flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Reference data sources
              </h2>
              {asOf && (
                <p className="text-[11px] text-[color:var(--muted-2)] font-mono">
                  Live quotes refreshed {new Date(asOf).toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
              {[
                { label: "USCF Investments — prospectus", url: "https://www.uscfinvestments.com/" },
                { label: "ETF.com", url: "https://www.etf.com/" },
                { label: "Yahoo Finance — live quotes", url: "https://finance.yahoo.com/" },
                { label: "AAII — independent verification", url: "https://www.aaii.com/etfdata" },
              ].map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[color:var(--line)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" style={{ color: "var(--accent)" }} />
                  <span className="font-semibold text-[color:var(--ink-2)]">{s.label}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-2.5 py-2 border border-[color:var(--line)]"
      style={{ background: "var(--bg)" }}
    >
      <p className="text-[9px] uppercase font-bold tracking-wider text-[color:var(--muted)]">
        {label}
      </p>
      <p className="text-num text-[14px] font-bold text-[color:var(--ink)] mt-0.5">{value}</p>
    </div>
  );
}
