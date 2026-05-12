"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import PayoffChart from "@/components/PayoffChart";

interface ScenarioPoint {
  etf_price: number;
  implied_fuel_price: number;
  fuel_pct_change: number;
  unhedged_annual_cost: number;
  option_payoff: number;
  hedged_annual_cost: number;
  savings_vs_spot: number;
  savings_pct: number;
}

interface StrategyOption {
  key: string;
  name: string;
  ticker: string;
  premium_label: string;
  contracts: number;
  max_loss: string | number;
  max_gain: string | number;
  hedge_fit: number;
}

interface ModelerResponse {
  company_id: number;
  company_name: string;
  fuel_type: string;
  strategies: StrategyOption[];
  selected_strategy: {
    strategy_key: string;
    display_name: string;
    ticker: string;
    contracts: number;
    legs: Array<{
      side: "long" | "short";
      option_type: "call" | "put";
      strike: number;
      premium_per_share: number;
      contracts: number;
    }>;
    description: string;
  };
  spot_etf_price: number;
  spot_fuel_price: number;
  current_annual_fuel_cost: number;
  monthly_gallons: number;
  correlation: number;
  net_premium: number;
  scenarios: ScenarioPoint[];
  breakeven_etf_price: number | null;
  breakeven_fuel_price: number | null;
  worst_case_savings: number;
  best_case_savings: number;
  max_loss: string;
  max_gain: string;
  etf_prices: Record<string, number>;
  as_of: string;
}

export default function ModelerPage() {
  const params = useParams();
  const companyId = Number(params.companyId);
  const [data, setData] = useState<ModelerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hedgeRatio, setHedgeRatio] = useState(0.5);
  const [strategyKey, setStrategyKey] = useState<string>("collar");

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
    current_annual_fuel_cost,
    monthly_gallons,
    correlation,
    scenarios,
    breakeven_etf_price,
    breakeven_fuel_price,
    worst_case_savings,
    best_case_savings,
    max_loss,
    max_gain,
    as_of,
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

      {/* Apple-style hero */}
      <section className="text-center md:py-10 py-4 mb-8">
        <span className="pill pill-accent inline-flex mb-4">
          <Calculator className="h-3 w-3" /> Live Scenario Modeler
        </span>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-3">
          What happens to {company_name}<br />if fuel prices move?
        </h1>
        <p className="text-[15px] md:text-[17px] text-[color:var(--muted)] max-w-2xl mx-auto leading-relaxed">
          We sweep the underlying ETF price across a range and price the option position at every
          point. Every cell below is computable, transparent, and printable.
        </p>
      </section>

      {/* Controls */}
      <div className="surface p-5 mb-7 flex flex-col md:flex-row md:items-end gap-4 no-print">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-2">
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
          <label className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-2">
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

      {/* Snapshot KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi kpi-accent">
          <div className="kpi-label">Spot ETF</div>
          <div className="kpi-value">${spot_etf_price.toFixed(2)}</div>
          <div className="kpi-sub">{selected_strategy.ticker}</div>
        </div>
        <div className="kpi kpi-teal">
          <div className="kpi-label">Spot Retail Fuel</div>
          <div className="kpi-value">${spot_fuel_price.toFixed(3)}</div>
          <div className="kpi-sub">per gallon · EIA</div>
        </div>
        <div className="kpi kpi-positive">
          <div className="kpi-label">Annual Fuel Cost</div>
          <div className="kpi-value">${current_annual_fuel_cost.toLocaleString()}</div>
          <div className="kpi-sub">unhedged baseline</div>
        </div>
        <div className="kpi kpi-ink">
          <div className="kpi-label">ETF ↔ Retail</div>
          <div className="kpi-value">{(correlation * 100).toFixed(0)}%</div>
          <div className="kpi-sub">24-mo correlation</div>
        </div>
      </div>

      {/* Strategy summary card */}
      <div className="surface p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <p
              className="text-[11px] uppercase tracking-wider font-semibold mb-1"
              style={{ color: "var(--accent-lo)" }}
            >
              {selected_strategy.strategy_key.replace(/_/g, " ")}
            </p>
            <h2 className="font-display text-[20px] font-bold tracking-tight">
              {selected_strategy.display_name}
            </h2>
            <p className="text-[13px] text-[color:var(--ink-2)] mt-2 leading-relaxed max-w-3xl">
              {selected_strategy.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0 text-center">
            <Stat label="Max Loss" value={max_loss} color="var(--negative)" />
            <Stat label="Max Gain" value={max_gain} color="var(--positive)" />
            <Stat
              label="Breakeven"
              value={
                breakeven_fuel_price != null
                  ? `$${breakeven_fuel_price.toFixed(3)}/gal`
                  : "—"
              }
            />
            <Stat
              label="Best-case savings"
              value={`$${best_case_savings.toLocaleString()}`}
              color="var(--positive)"
            />
          </div>
        </div>
        <div className="hr my-4" />
        <div className="flex flex-wrap items-center gap-3 text-[12px]">
          {selected_strategy.legs.map((leg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={`pill ${leg.side === "long" ? "pill-positive" : "pill-warning"}`}>
                {leg.side === "long" ? "BUY" : "SELL"}
              </span>
              <span className="text-num font-semibold">
                ${leg.strike.toFixed(2)} {leg.option_type}
              </span>
              <span className="text-[color:var(--muted)]">× {leg.contracts}</span>
              <span className="text-[color:var(--muted)]">
                @ ${leg.premium_per_share.toFixed(2)}/sh
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="surface p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="h-section flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Payoff Across ETF Price Range
          </h2>
          <span className="text-[10px] text-[color:var(--muted-2)] font-mono">
            {new Date(as_of).toLocaleString()}
          </span>
        </div>
        <PayoffChart
          scenarios={scenarios}
          spotEtfPrice={spot_etf_price}
          breakevenEtfPrice={breakeven_etf_price}
        />
        <p className="text-[11px] text-[color:var(--muted)] mt-3 leading-relaxed">
          <strong className="text-[color:var(--ink-2)]">Reading the chart.</strong> Red line =
          unhedged fuel cost. Orange line = hedged total cost (fuel − option payoff). Green shaded
          area = savings vs current-price baseline. The breakeven vertical line marks where savings
          flip from negative to positive.
        </p>
      </div>

      {/* Scenario table */}
      <div className="surface mb-6" style={{ padding: 0, overflow: "hidden" }}>
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <h2 className="h-section">Scenario Table</h2>
          <span className="text-[10px] text-[color:var(--muted-2)]">
            {scenarios.length} scenarios · {monthly_gallons.toLocaleString()} gallons/mo
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
                <th className="right">Option P&amp;L</th>
                <th className="right">Hedged Cost</th>
                <th className="right">Savings</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const isSpot =
                  Math.abs(s.etf_price - spot_etf_price) < 0.5;
                return (
                  <tr
                    key={s.etf_price}
                    style={isSpot ? { background: "var(--accent-tint)", fontWeight: 600 } : undefined}
                  >
                    <td className="num font-semibold">${s.etf_price.toFixed(2)}{isSpot && " · spot"}</td>
                    <td
                      className="right num font-semibold"
                      style={{
                        color: s.fuel_pct_change >= 0 ? "var(--negative)" : "var(--positive)",
                      }}
                    >
                      {s.fuel_pct_change >= 0 ? "+" : ""}
                      {s.fuel_pct_change.toFixed(1)}%
                    </td>
                    <td className="right num">${s.implied_fuel_price.toFixed(3)}</td>
                    <td className="right num">${s.unhedged_annual_cost.toLocaleString()}</td>
                    <td
                      className="right num font-semibold"
                      style={{
                        color: s.option_payoff >= 0 ? "var(--positive)" : "var(--negative)",
                      }}
                    >
                      {s.option_payoff >= 0 ? "+" : ""}${s.option_payoff.toLocaleString()}
                    </td>
                    <td className="right num">${s.hedged_annual_cost.toLocaleString()}</td>
                    <td
                      className="right num font-semibold"
                      style={{
                        color: s.savings_vs_spot >= 0 ? "var(--positive)" : "var(--negative)",
                      }}
                    >
                      {s.savings_vs_spot >= 0 ? "+" : ""}${s.savings_vs_spot.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Headline takeaways */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Takeaway
          icon={<TrendingUp className="h-4 w-4" />}
          label="Best case"
          value={`+$${best_case_savings.toLocaleString()}`}
          sub="annual savings if fuel spikes to top of range"
          color="var(--positive)"
        />
        <Takeaway
          icon={<TrendingDown className="h-4 w-4" />}
          label="Worst case"
          value={`${worst_case_savings >= 0 ? "+" : ""}$${worst_case_savings.toLocaleString()}`}
          sub="annual P&L if fuel falls to bottom of range"
          color={worst_case_savings >= 0 ? "var(--positive)" : "var(--negative)"}
        />
        <Takeaway
          icon={<Target className="h-4 w-4" />}
          label="Breakeven"
          value={breakeven_fuel_price ? `$${breakeven_fuel_price.toFixed(3)}/gal` : "—"}
          sub={
            breakeven_etf_price
              ? `ETF must reach $${breakeven_etf_price.toFixed(2)}`
              : "Strategy profits at any positive fuel-price move"
          }
          color="var(--accent-lo)"
        />
      </div>

      {/* Methodology footer */}
      <div className="surface p-5" style={{ background: "var(--bg)" }}>
        <h3 className="h-section mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> How this works
        </h3>
        <ol className="space-y-1.5 text-[12px] text-[color:var(--ink-2)] list-decimal pl-5 leading-relaxed">
          <li>
            <strong>ETF price sweep:</strong> from -30% to +60% of today&apos;s spot in ~5% steps.
          </li>
          <li>
            <strong>Implied retail fuel:</strong> ETF % change × 24-month ETF-to-retail correlation
            ({(correlation * 100).toFixed(0)}% for {selected_strategy.ticker}).
          </li>
          <li>
            <strong>Unhedged cost:</strong> {monthly_gallons.toLocaleString()} gal/mo × 12 ×
            implied retail price.
          </li>
          <li>
            <strong>Option payoff at expiry:</strong> per leg, (intrinsic value − entry premium) ×
            direction × 100 × contracts. Summed across all legs.
          </li>
          <li>
            <strong>Hedged cost:</strong> unhedged − option payoff.
          </li>
          <li>
            <strong>Savings:</strong> current annual cost at today&apos;s retail price minus the
            hedged cost in that scenario.
          </li>
        </ol>
        <Link
          href="/sources"
          className="inline-flex items-center gap-1 text-[12px] font-semibold mt-3"
          style={{ color: "var(--accent)" }}
        >
          Full sources &amp; methodology <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="px-3 py-2 rounded-lg border border-[color:var(--line)]" style={{ background: "var(--bg)" }}>
      <p className="text-[9px] uppercase font-bold tracking-wider text-[color:var(--muted)]">{label}</p>
      <p className="text-num text-[14px] font-bold mt-0.5" style={{ color: color ?? "var(--ink)" }}>{String(value)}</p>
    </div>
  );
}

function Takeaway({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <p className="text-[10px] uppercase tracking-wider font-bold text-[color:var(--muted)]">
          {label}
        </p>
      </div>
      <p className="text-num text-[24px] font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-[color:var(--muted)] mt-1 leading-relaxed">{sub}</p>
    </div>
  );
}
