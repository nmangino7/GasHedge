"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

interface TickerQuote {
  ticker: string;
  price: number;
  changePct: number;
}

interface Props {
  refreshMs?: number;
}

export default function MarketTicker({ refreshMs = 5 * 60 * 1000 }: Props) {
  const [quotes, setQuotes] = useState<TickerQuote[]>([]);
  const [asOf, setAsOf] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const res = await fetch("/api/etfs");
        if (!res.ok) return;
        const data = (await res.json()) as {
          etfs: Array<{ ticker: string; quote: { price: number; changePct: number } | null }>;
          as_of: string;
        };
        if (cancelled) return;
        setQuotes(
          data.etfs
            .filter((e) => e.quote)
            .map((e) => ({
              ticker: e.ticker,
              price: e.quote!.price,
              changePct: e.quote!.changePct,
            }))
        );
        setAsOf(data.as_of);
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(load, refreshMs);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshMs]);

  if (loading && quotes.length === 0) return null;

  return (
    <div
      className="hidden md:flex items-center gap-3 px-5 py-2 border-b text-[12px] no-print"
      style={{ background: "var(--bg-elev)", borderColor: "var(--line)" }}
    >
      <span
        className="text-[9px] uppercase tracking-wider font-bold"
        style={{ color: "var(--muted)" }}
      >
        Live Market
      </span>
      <div className="flex items-center gap-5 flex-1 overflow-x-auto">
        {quotes.map((q) => {
          const Icon =
            q.changePct > 0.001 ? TrendingUp : q.changePct < -0.001 ? TrendingDown : Minus;
          return (
            <div key={q.ticker} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="ticker text-[12px] font-bold" style={{ color: "var(--ink)" }}>
                {q.ticker}
              </span>
              <span className="text-num font-semibold" style={{ color: "var(--ink-2)" }}>
                ${q.price.toFixed(2)}
              </span>
              <span
                className="text-num text-[11px] font-semibold flex items-center gap-0.5"
                style={{
                  color: q.changePct >= 0 ? "var(--positive)" : "var(--negative)",
                }}
              >
                <Icon className="h-2.5 w-2.5" />
                {q.changePct >= 0 ? "+" : ""}
                {q.changePct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      <span
        className="text-[10px] flex items-center gap-1"
        style={{ color: "var(--muted-2)" }}
      >
        <Clock className="h-2.5 w-2.5" />
        {asOf ? new Date(asOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
      </span>
    </div>
  );
}
