"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  Loader2,
  Printer,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Activity,
  Zap,
} from "lucide-react";
import PayoffDiagram from "@/components/PayoffDiagram";

interface PayoffRow {
  underlying_price: number;
  pnl_today: number;
  pnl_mid: number;
  pnl_expiry: number;
  implied_fuel_price?: number;
}

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface ChainLeg {
  leg_index: number;
  strike: number;
  option_type: "call" | "put";
  market_iv: number | null;
  market_mid: number | null;
  market_bid: number | null;
  market_ask: number | null;
  open_interest: number | null;
  volume: number | null;
}

interface ScenarioPoint {
  etf_price: number;
  implied_fuel_price: number;
  fuel_pct_change: number;
  unhedged_annual_cost: number;
  option_payoff: number;
  etf_payoff: number;
  hedge_payoff: number;
  hedged_annual_cost: number;
  hedge_value: number;
}

interface StrategyOption {
  key: string;
  name: string;
  ticker: string;
  premium_label: string;
  contracts: number;
  max_loss: string | number;
  max_gain: string | number;
}

interface ModelerResponse {
  company_id: number;
  company_name: string;
  fuel_type: string;
  strategies: StrategyOption[];
  selected_strategy: {
    strategy_key: string;
    display_name: string;
    description: string;
    rationale: string;
    ticker: string;
    contracts: number;
    expiry_days: number;
    underlying_price: number;
    total_premium: number;
    total_premium_label: string;
    legs: Array<{
      side: "long" | "short";
      option_type: "call" | "put";
      strike: number;
      premium_per_share: number;
      contracts: number;
      iv_used: number;
    }>;
    shares_required?: number;
  };
  payoff: {
    rows: PayoffRow[];
    breakevens: number[];
    max_profit: number;
    max_loss: number;
    spot: number;
    days_to_expiry: number;
    iv_used: number;
    pop: number;
    greeks: Greeks;
    underlying_shares: number;
    underlying_value: number;
  };
  spot_etf_price: number;
  spot_fuel_price: number;
  current_annual_fuel_cost: number;
  monthly_gallons: number;
  correlation: number;
  scenarios: ScenarioPoint[];
  shares_owned: number;
  capital_required: number;
  market_data: {
    used_live_chain: boolean;
    chain_legs: ChainLeg[];
  };
  etf_prices: Record<string, number>;
  as_of: string;
}

export default function ModelerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = Number(params.companyId);
  const [data, setData] = useState<ModelerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hedgeRatio, setHedgeRatio] = useState(0.5);
  const [strategyKey, setStrategyKey] = useState<string>(
    searchParams.get("strategy") ?? "long_call"
  );
  const [view, setView] = useState<"payoff" | "fuel_scenarios">("payoff");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/modeler/${companyId}?strategy=${strategyKey}&hedge_ratio=${hedgeRatio}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      const d = (await res.json()) as ModelerResponse;
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [companyId, strategyKey, hedgeRatio]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32 text-[color:var(--muted)]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading scenarios...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="surface p-5" style={{ background: "var(--negative-tint)" }}>
        <AlertTriangle className="h-5 w-5 mb-2" style={{ color: "var(--negative)" }} />
        <p className="font-semibold" style={{ color: "var(--negative)" }}>
          Unable to load modeler
        </p>
        <p className="text-xs text-[color:var(--muted)] mt-1">{error}</p>
        <Link href={`/companies/${companyId}`} className="btn btn-ghost btn-sm mt-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to client
        </Link>
      </div>
    );
  }

  const {
    company_name,
    strategies,
    selected_strategy,
    spot_etf_price,
    spot_fuel_price,
    payoff,
    correlation,
    scenarios,
    market_data,
    as_of,
    capital_required,
    shares_owned,
  } = data;

  return (
    <div>
      <Link
        href={`/hedging/${companyId}`}
        className="text-[12px] font-semibold inline-flex items-center gap-1 mb-3 no-print"
        style={{ color: "var(--accent)" }}
      >
        <ArrowLeft className="h-3 w-3" /> Back to strategies
      </Link>

      {/* Hero */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="pill pill-accent">
            <Calculator className="h-3 w-3" /> Live Scenario Modeler
          </span>
          {market_data.used_live_chain && (
            <span className="pill pill-live">
              <Activity className="h-3 w-3" /> Live Yahoo chain
            </span>
          )}
          <span className="text-[10px] text-[color:var(--muted-2)] font-mono">
            {new Date(as_of).toLocaleTimeString()}
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-[1.05]">
          {selected_strategy.display_name}
        </h1>
        <p className="text-[14px] text-[color:var(--muted)] mt-1">
          {company_name} · {selected_strategy.contracts} contracts · {payoff.days_to_expiry}-day expiry
        </p>
      </section>

      {/* Controls */}
      <div className="surface p-4 mb-5 flex flex-col md:flex-row md:items-end gap-3 no-print">
        <div className="flex-1 min-w-[240px]">
          <label className="text-[10px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1">
            Strategy
          </label>
          <select
            className="select"
            value={strategyKey}
            onChange={(e) => setStrategyKey(e.target.value)}
          >
            {strategies.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name} · {s.ticker} · {s.premium_label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1">
            Hedge Ratio
          </label>
          <div className="flex gap-1.5">
            {[0.25, 0.5, 0.75].map((r) => (
              <button
                key={r}
                onClick={() => setHedgeRatio(r)}
                className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
                style={{
                  background: hedgeRatio === r ? "var(--accent)" : "transparent",
                  color: hedgeRatio === r ? "#fff" : "var(--ink-2)",
                  border: `1px solid ${hedgeRatio === r ? "var(--accent)" : "var(--line)"}`,
                }}
              >
                {(r * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => window.print()} className="btn btn-primary">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {/* OPTIONSTRAT-STYLE TOP STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
        <Stat label="Max Profit" value={payoff.max_profit >= 1e9 ? "Unlimited" : `+$${payoff.max_profit.toLocaleString()}`} color="var(--positive)" />
        <Stat label="Max Loss" value={payoff.max_loss <= -1e9 ? "Unlimited" : `$${payoff.max_loss.toLocaleString()}`} color="var(--negative)" />
        <Stat label="Breakeven(s)" value={payoff.breakevens.length === 0 ? "None" : payoff.breakevens.map((b) => `$${b.toFixed(2)}`).join(" / ")} />
        <Stat label="Prob. of Profit" value={`${payoff.pop.toFixed(1)}%`} color={payoff.pop >= 50 ? "var(--positive)" : "var(--warning)"} />
        <Stat label="Spot ETF" value={`$${spot_etf_price.toFixed(2)}`} />
        <Stat label="Days to Expiry" value={`${payoff.days_to_expiry}d`} />
      </div>

      {/* P&L DIAGRAM */}
      <div className="surface p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="h-section flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Payoff Diagram
          </h2>
          <div className="flex gap-1 text-[10px]">
            <span className="inline-flex items-center gap-1 text-[color:var(--muted)]">
              <span className="inline-block w-3 h-0.5 bg-[color:var(--ink)]"></span> At expiry
            </span>
            <span className="inline-flex items-center gap-1 text-[color:var(--muted)] ml-3">
              <span className="inline-block w-3 h-0.5" style={{ background: "#d4762a" }}></span> Halfway
            </span>
            <span className="inline-flex items-center gap-1 text-[color:var(--muted)] ml-3">
              <span className="inline-block w-3 h-0.5 bg-[color:var(--muted)]"></span> Today
            </span>
          </div>
        </div>
        <PayoffDiagram
          rows={payoff.rows}
          spot={payoff.spot}
          breakevens={payoff.breakevens}
          daysToExpiry={payoff.days_to_expiry}
          height={420}
        />
        <p className="text-[11px] text-[color:var(--muted)] mt-2 leading-relaxed">
          <strong className="text-[color:var(--ink-2)]">Reading the diagram.</strong>{" "}
          Solid black line = P&L at expiry. Dashed orange = halfway to expiry. Dotted gray = today (full time premium intact). Green shaded zones = profit. Vertical lines mark spot price and breakeven(s). Hover to see exact P&L at any underlying price.
        </p>
      </div>

      {/* GREEKS + LEGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Greeks */}
        <div className="surface p-5">
          <h3 className="h-section mb-3">Position Greeks (Net Exposure)</h3>
          <div className="grid grid-cols-2 gap-3">
            <GreekTile label="Delta (Δ)" value={payoff.greeks.delta.toLocaleString()} sub="P&L change per $1 ETF move" />
            <GreekTile label="Gamma (Γ)" value={payoff.greeks.gamma.toFixed(2)} sub="Δ change per $1 ETF move" />
            <GreekTile label="Theta (Θ)" value={`$${payoff.greeks.theta.toFixed(0)}/d`} sub="time decay per day" color={payoff.greeks.theta >= 0 ? "var(--positive)" : "var(--negative)"} />
            <GreekTile label="Vega (V)" value={`$${payoff.greeks.vega.toFixed(0)}`} sub="P&L per 1% IV change" />
          </div>
        </div>

        {/* Legs detail */}
        <div className="surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="h-section">Position Legs</h3>
            {market_data.used_live_chain ? (
              <span className="pill pill-positive">Live chain mids</span>
            ) : (
              <span className="pill pill-warning">Modeled (BS)</span>
            )}
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Side</th>
                <th>Type</th>
                <th className="right">Strike</th>
                <th className="right">Qty</th>
                <th className="right">$/sh</th>
                <th className="right">IV</th>
                {market_data.used_live_chain && <th className="right">OI</th>}
              </tr>
            </thead>
            <tbody>
              {selected_strategy.legs.map((leg, i) => {
                const ml = market_data.chain_legs[i];
                return (
                  <tr key={i}>
                    <td>
                      <span className={`pill ${leg.side === "long" ? "pill-positive" : "pill-warning"}`}>
                        {leg.side === "long" ? "BUY" : "SELL"}
                      </span>
                    </td>
                    <td>{leg.option_type.toUpperCase()}</td>
                    <td className="right num">${leg.strike.toFixed(2)}</td>
                    <td className="right num">{leg.contracts}</td>
                    <td className="right num">${leg.premium_per_share.toFixed(2)}</td>
                    <td className="right num">{(leg.iv_used * 100).toFixed(0)}%</td>
                    {market_data.used_live_chain && (
                      <td className="right num text-[11px] text-[color:var(--muted)]">
                        {ml?.open_interest?.toLocaleString() ?? "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAPITAL & STRATEGY SUMMARY */}
      <div className="surface p-5 mb-5" style={{ background: "var(--bg)" }}>
        <h3 className="h-section mb-3">Strategy Summary</h3>
        <p className="text-[13px] text-[color:var(--ink-2)] leading-relaxed">
          {selected_strategy.description}
        </p>
        <p className="text-[12px] text-[color:var(--muted)] mt-2 leading-relaxed italic">
          <strong className="not-italic text-[color:var(--ink-2)]">Why this works:</strong>{" "}
          {selected_strategy.rationale}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-[12px]">
          <KV label="Net Premium" value={selected_strategy.total_premium_label} />
          <KV label="Capital Required" value={`$${capital_required.toLocaleString()}`} />
          {shares_owned > 0 && <KV label="ETF Shares Held" value={shares_owned.toLocaleString()} />}
          <KV label="Avg IV Used" value={`${(payoff.iv_used * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* VIEW TOGGLE — Fuel scenario table */}
      <div className="surface mb-5" style={{ padding: 0, overflow: "hidden" }}>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h3 className="h-section flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Fuel-cost Scenarios (Annualized)
          </h3>
          <span className="text-[10px] text-[color:var(--muted-2)]">
            {scenarios.length} scenarios · correlation {(correlation * 100).toFixed(0)}%
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>ETF Price</th>
                <th className="right">Fuel Δ</th>
                <th className="right">Retail $/gal</th>
                <th className="right">Unhedged Cost</th>
                {shares_owned > 0 && <th className="right">ETF P&amp;L</th>}
                <th className="right">Options P&amp;L</th>
                <th className="right">Hedged Cost</th>
                <th className="right">Hedge Value</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const isSpot = Math.abs(s.etf_price - spot_etf_price) < 0.5;
                return (
                  <tr key={s.etf_price} style={isSpot ? { background: "var(--accent-tint)", fontWeight: 600 } : undefined}>
                    <td className="num font-semibold">${s.etf_price.toFixed(2)}{isSpot && " · spot"}</td>
                    <td className="right num font-semibold" style={{ color: s.fuel_pct_change >= 0 ? "var(--negative)" : "var(--positive)" }}>
                      {s.fuel_pct_change >= 0 ? "+" : ""}{s.fuel_pct_change.toFixed(1)}%
                    </td>
                    <td className="right num">${s.implied_fuel_price.toFixed(3)}</td>
                    <td className="right num">${s.unhedged_annual_cost.toLocaleString()}</td>
                    {shares_owned > 0 && (
                      <td className="right num font-semibold" style={{ color: s.etf_payoff >= 0 ? "var(--positive)" : "var(--negative)" }}>
                        {s.etf_payoff >= 0 ? "+" : ""}${s.etf_payoff.toLocaleString()}
                      </td>
                    )}
                    <td className="right num font-semibold" style={{ color: s.option_payoff >= 0 ? "var(--positive)" : "var(--negative)" }}>
                      {s.option_payoff >= 0 ? "+" : ""}${s.option_payoff.toLocaleString()}
                    </td>
                    <td className="right num">${s.hedged_annual_cost.toLocaleString()}</td>
                    <td className="right num font-semibold" style={{ color: s.hedge_value >= 0 ? "var(--positive)" : "var(--negative)" }}>
                      {s.hedge_value >= 0 ? "+" : ""}${s.hedge_value.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology */}
      <div className="surface p-5 mb-5" style={{ background: "var(--bg)" }}>
        <h3 className="h-section mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px] text-[color:var(--ink-2)] leading-relaxed">
          <div>
            <p className="font-semibold mb-2 text-[color:var(--ink)]">Payoff diagram</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>At expiry:</strong> intrinsic value of each leg − entry premium paid</li>
              <li><strong>Halfway:</strong> Black-Scholes value with time = days_to_expiry/2</li>
              <li><strong>Today:</strong> BS value at full time-to-expiry (current state)</li>
              <li>Range: ±50% from spot ETF, 80 points</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 text-[color:var(--ink)]">Probability + Greeks</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>POP:</strong> integrate lognormal price density over the profitable region at expiry</li>
              <li><strong>Delta:</strong> per-leg ∂Price/∂Spot × contracts × 100 × side</li>
              <li><strong>Theta:</strong> per-calendar-day time decay (BS partial)</li>
              <li>IV: pulled from <a href="https://finance.yahoo.com/" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: "var(--accent-lo)" }}>Yahoo chain</a> when available; default per-ticker otherwise</li>
            </ul>
          </div>
        </div>
        <Link href="/sources" className="inline-flex items-center gap-1 text-[12px] font-semibold mt-3" style={{ color: "var(--accent)" }}>
          Full sources &amp; methodology <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="surface p-3.5">
      <p className="text-[9px] uppercase font-bold tracking-wider text-[color:var(--muted)]">
        {label}
      </p>
      <p className="text-num text-[16px] font-bold mt-1" style={{ color: color ?? "var(--ink)" }}>
        {value}
      </p>
    </div>
  );
}

function GreekTile({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="rounded-lg p-3 border border-[color:var(--line)]" style={{ background: "var(--bg)" }}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-[color:var(--muted)]">{label}</p>
      <p className="text-num text-[20px] font-bold mt-0.5" style={{ color: color ?? "var(--ink)" }}>{value}</p>
      <p className="text-[10px] text-[color:var(--muted-2)] mt-0.5">{sub}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-semibold tracking-wider text-[color:var(--muted)]">{label}</p>
      <p className="text-num text-[13px] font-bold mt-0.5">{value}</p>
    </div>
  );
}
