"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, ArrowRight, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import type { EtfMeta } from "@/lib/etf-library";

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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-7 gap-4">
        <div>
          <span className="h-section">Underlyings</span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
            <Flame className="h-7 w-7 text-[color:var(--accent)]" />
            ETF Library
          </h1>
          <p className="text-sm text-[color:var(--muted)] mt-1.5 max-w-2xl">
            Every fuel-ETF you can recommend under a Series 65/66 license. Live quotes from Yahoo
            Finance · structure, expense, AUM, and options metadata pulled from issuer reference data.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[color:var(--muted)]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading ETFs...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {etfs.map((etf) => (
            <Link key={etf.ticker} href={`/etfs/${etf.ticker}`} className="surface-raised p-6 group">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="ticker text-[22px] font-bold text-[color:var(--ink)]">
                      {etf.ticker}
                    </span>
                    <span className="pill pill-outline capitalize">{etf.primary_fuel}</span>
                  </div>
                  <h2 className="font-display text-[16px] font-bold tracking-tight text-[color:var(--ink)] truncate group-hover:text-[color:var(--accent)]">
                    {etf.name}
                  </h2>
                  <p className="text-[11px] text-[color:var(--muted)] mt-0.5">{etf.underlying}</p>
                </div>
                <div className="text-right shrink-0">
                  {etf.quote ? (
                    <>
                      <p className="text-num text-[22px] font-bold">
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

              <div className="grid grid-cols-4 gap-2 mb-3 text-[12px]">
                <Stat label="Expense" value={`${(etf.expense_ratio * 100).toFixed(2)}%`} />
                <Stat label="AUM" value={`$${etf.aum_millions}M`} />
                <Stat label="Corr · retail" value={`${(etf.correlation_to_retail * 100).toFixed(0)}%`} />
                <Stat
                  label="ADV"
                  value={`${(etf.avg_daily_volume_thousands / 1000).toFixed(1)}M`}
                />
              </div>

              <p className="text-[12px] text-[color:var(--ink-2)] leading-relaxed mb-3 line-clamp-3">
                {etf.description}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-[color:var(--line)]">
                <div className="flex items-center gap-1.5">
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
                </div>
                <span className="text-[12px] font-semibold text-[color:var(--accent)] flex items-center gap-1 group-hover:gap-2 transition-all">
                  View details <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--bg)" }}>
      <p className="text-[9px] uppercase font-semibold tracking-wider text-[color:var(--muted)]">
        {label}
      </p>
      <p className="text-num text-[13px] font-bold text-[color:var(--ink)] mt-0.5">{value}</p>
    </div>
  );
}
