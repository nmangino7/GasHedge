"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ContractRow {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  inTheMoney: boolean;
}

interface ChainExpiry {
  expirationDate: string;
  daysToExpiry: number;
  calls: ContractRow[];
  puts: ContractRow[];
}

interface FullChain {
  symbol: string;
  underlyingPrice: number;
  expirations: ChainExpiry[];
  asOf: string;
}

export interface PickedContract {
  contractSymbol: string;
  strike: number;
  expiry: string;
  daysToExpiry: number;
  premium: number;
  mid: number | null;
  bid: number | null;
  ask: number | null;
  impliedVolatility: number | null;
  underlyingPrice: number;
  optionType: "call" | "put";
}

export default function OptionsChainPicker({
  ticker,
  optionType,
  preferredDays = 90,
  preferredStrike,
  onPick,
}: {
  ticker: string;
  optionType: "call" | "put";
  preferredDays?: number;
  preferredStrike?: number;
  onPick: (c: PickedContract | null) => void;
}) {
  const [chain, setChain] = useState<FullChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expIdx, setExpIdx] = useState(0);
  const [strikeIdx, setStrikeIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setChain(null);
    fetch(`/api/options-chain/${ticker.toUpperCase()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Chain fetch failed (${r.status})`);
        return r.json() as Promise<FullChain>;
      })
      .then((c) => {
        if (cancelled) return;
        setChain(c);
        const closestExpIdx = c.expirations.reduce(
          (best, e, i) =>
            Math.abs(e.daysToExpiry - preferredDays) <
            Math.abs(c.expirations[best].daysToExpiry - preferredDays)
              ? i
              : best,
          0
        );
        setExpIdx(closestExpIdx);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, preferredDays]);

  const currentExpiry = chain?.expirations[expIdx];
  const contracts = useMemo(() => {
    if (!currentExpiry) return [] as ContractRow[];
    const list = optionType === "call" ? currentExpiry.calls : currentExpiry.puts;
    return [...list].sort((a, b) => a.strike - b.strike);
  }, [currentExpiry, optionType]);

  // When expiry changes, pick the strike nearest the preferred (or ATM) and emit
  useEffect(() => {
    if (!chain || !currentExpiry || contracts.length === 0) {
      onPick(null);
      return;
    }
    const target = preferredStrike ?? chain.underlyingPrice;
    const nearestIdx = contracts.reduce(
      (best, c, i) => (Math.abs(c.strike - target) < Math.abs(contracts[best].strike - target) ? i : best),
      0
    );
    setStrikeIdx(nearestIdx);
    const c = contracts[nearestIdx];
    emit(c, currentExpiry, chain.underlyingPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chain, expIdx, optionType]);

  function emit(c: ContractRow, exp: ChainExpiry, underlying: number) {
    onPick({
      contractSymbol: c.contractSymbol,
      strike: c.strike,
      expiry: exp.expirationDate,
      daysToExpiry: exp.daysToExpiry,
      premium: c.mid ?? c.lastPrice ?? 0,
      mid: c.mid,
      bid: c.bid,
      ask: c.ask,
      impliedVolatility: c.impliedVolatility,
      underlyingPrice: underlying,
      optionType,
    });
  }

  if (loading) {
    return (
      <div className="surface p-4 flex items-center gap-3 text-[13px] text-[color:var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading {ticker.toUpperCase()} options chain from Yahoo Finance...
      </div>
    );
  }
  if (err || !chain) {
    return (
      <div
        className="surface p-3 flex items-start gap-3"
        style={{ borderColor: "var(--warning-tint)", background: "var(--warning-tint)" }}
      >
        <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: "var(--warning)" }} />
        <div className="text-[12px]" style={{ color: "var(--warning)" }}>
          <p className="font-semibold">Live chain unavailable</p>
          <p className="text-[color:var(--muted)] mt-0.5">{err ?? "No data"}. Enter strike + premium manually below.</p>
        </div>
      </div>
    );
  }

  const selected = contracts[strikeIdx];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[color:var(--muted)] uppercase tracking-wider">
            Expiration ({chain.expirations.length} available)
          </span>
          <select
            className="select"
            value={expIdx}
            onChange={(e) => setExpIdx(Number(e.target.value))}
          >
            {chain.expirations.map((e, i) => (
              <option key={e.expirationDate} value={i}>
                {e.expirationDate} ({e.daysToExpiry}d)
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-[color:var(--muted)] uppercase tracking-wider">
            Strike ({contracts.length} {optionType}s)
          </span>
          <select
            className="select"
            value={strikeIdx}
            onChange={(e) => {
              const i = Number(e.target.value);
              setStrikeIdx(i);
              if (currentExpiry) emit(contracts[i], currentExpiry, chain.underlyingPrice);
            }}
          >
            {contracts.map((c, i) => (
              <option key={c.contractSymbol} value={i}>
                ${c.strike.toFixed(2)} {c.inTheMoney ? "· ITM" : ""}
                {c.mid ? ` · mid $${c.mid.toFixed(2)}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selected && (
        <div className="surface p-3" style={{ background: "var(--bg)" }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--positive)" }} />
            <span className="text-[11px] font-semibold text-[color:var(--ink-2)] tracking-tight font-mono">
              {selected.contractSymbol}
            </span>
            {selected.inTheMoney && (
              <span className="pill pill-warning text-[9px] py-0">ITM</span>
            )}
            <span className="ml-auto text-[10px] text-[color:var(--muted-2)]">
              underlying ${chain.underlyingPrice.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-3 text-[12px]">
            <Stat label="Bid" value={selected.bid !== null ? `$${selected.bid.toFixed(2)}` : "—"} />
            <Stat
              label="Mid"
              value={selected.mid !== null ? `$${selected.mid.toFixed(2)}` : "—"}
              emphasize
            />
            <Stat label="Ask" value={selected.ask !== null ? `$${selected.ask.toFixed(2)}` : "—"} />
            <Stat label="IV" value={selected.impliedVolatility !== null ? `${(selected.impliedVolatility * 100).toFixed(0)}%` : "—"} />
            <Stat label="OI" value={selected.openInterest?.toLocaleString() ?? "—"} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider font-semibold text-[color:var(--muted)]">{label}</p>
      <p
        className={`text-num ${emphasize ? "text-[14px] font-bold text-[color:var(--accent-lo)]" : "text-[12px] text-[color:var(--ink-2)]"}`}
      >
        {value}
      </p>
    </div>
  );
}
