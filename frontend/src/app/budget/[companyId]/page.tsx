"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Calculator,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Shield,
  Loader2,
  ArrowRight,
} from "lucide-react";
import ErrorAlert from "@/components/ErrorAlert";

interface BurnDownEntry {
  month: number;
  label: string;
  spent: number;
  remaining: number;
  on_track: boolean;
}

interface Scenario {
  price_change_pct: number;
  new_price: number;
  annual_cost: number;
  over_budget: number;
  months_until_exhausted: number;
  hedged_annual_cost: number;
  hedged_over_budget: number;
  hedge_savings: number;
}

interface BudgetData {
  company_id: number;
  company_name: string;
  fuel_type: string;
  monthly_gallons: number;
  current_price: number;
  annual_budget: number;
  annual_base_cost: number;
  monthly_base_cost: number;
  budget_utilization_pct: number;
  budget_status: "healthy" | "warning" | "over";
  burn_down: BurnDownEntry[];
  scenarios: Scenario[];
  hedge_ratio: number;
}

export default function BudgetPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<string>("");
  const [hedgeRatio, setHedgeRatio] = useState<number>(0.5);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchBudget();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, budget, hedgeRatio]);

  async function fetchBudget() {
    try {
      setLoading(true);
      setError(null);
      const budgetParam = budget ? `&budget=${budget}` : "";
      const res = await fetch(`/api/budget/${companyId}?hedge_ratio=${hedgeRatio}${budgetParam}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch budget data");
      }
      const json = await res.json();
      setData(json);
      if (!budget && json.annual_budget) setBudget(String(json.annual_budget));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  if (error) {
    return (
      <ErrorAlert
        title="Budget Calculation Error"
        message={error}
        suggestion="Please check the company ID and try again."
        onRetry={fetchBudget}
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--muted-2)]" />
      </div>
    );
  }

  if (!data) return null;

  const statusPill =
    data.budget_status === "healthy"
      ? "pill-positive"
      : data.budget_status === "warning"
      ? "pill-warning"
      : "pill-negative";
  const statusLabel =
    data.budget_status === "healthy" ? "Healthy" : data.budget_status === "warning" ? "Warning" : "Over Budget";
  const statusTint =
    data.budget_status === "healthy" ? "var(--positive-tint)" : data.budget_status === "warning" ? "var(--warning-tint)" : "var(--negative-tint)";
  const statusColor =
    data.budget_status === "healthy" ? "var(--positive)" : data.budget_status === "warning" ? "var(--warning)" : "var(--negative)";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}
        >
          <Calculator className="h-6 w-6" />
        </div>
        <div>
          <span className="h-section">Fuel Budget Modeler</span>
          <h1 className="font-display text-3xl font-bold tracking-tight">{data.company_name}</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            Budget vs. projected spend · burn-down · hedge impact comparison
          </p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--muted-2)] ml-2" />}
      </div>

      {/* Controls */}
      <div className="surface p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">
              Annual Fuel Budget
            </span>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted-2)]" />
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Enter annual budget"
                className="input pl-9"
              />
            </div>
          </label>
          <div>
            <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">
              Hedge Ratio
            </span>
            <div className="flex gap-2">
              {[
                { label: "25%", value: 0.25 },
                { label: "50%", value: 0.5 },
                { label: "75%", value: 0.75 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHedgeRatio(opt.value)}
                  className="flex-1 py-2 px-3 rounded-lg text-[13px] font-semibold transition-colors"
                  style={{
                    background: hedgeRatio === opt.value ? "var(--ink)" : "transparent",
                    color: hedgeRatio === opt.value ? "#fff" : "var(--ink-2)",
                    border: `1px solid ${hedgeRatio === opt.value ? "var(--ink)" : "var(--line)"}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi kpi-accent">
          <div className="kpi-label flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Annual Budget</div>
          <div className="kpi-value">{formatCurrency(data.annual_budget)}</div>
        </div>
        <div className="kpi kpi-ink">
          <div className="kpi-label flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Projected Cost</div>
          <div className="kpi-value">{formatCurrency(data.annual_base_cost)}</div>
        </div>
        <div className="kpi kpi-teal">
          <div className="kpi-label flex items-center gap-1.5"><Calculator className="h-3 w-3" /> Utilization</div>
          <div className="kpi-value">{data.budget_utilization_pct}%</div>
        </div>
        <div className="kpi" style={{ borderTop: `3px solid ${statusColor}` }}>
          <div className="kpi-label flex items-center gap-1.5"><Shield className="h-3 w-3" /> Status</div>
          <div className="mt-1">
            <span className={`pill ${statusPill}`} style={{ padding: "5px 12px", fontSize: "12px" }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="surface p-5">
        <h2 className="h-section mb-3">Budget Burn-Down</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.burn_down}>
              <defs>
                <linearGradient id="remainingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4762a" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#d4762a" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: unknown) => [formatCurrency(Number(value))]}
                labelFormatter={(label: unknown) => `Month: ${label}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  fontSize: "12px",
                  background: "var(--bg-elev)",
                }}
              />
              <ReferenceLine y={0} stroke="var(--negative)" strokeDasharray="4 4" label={{ value: "Exhausted", fill: "var(--negative)", fontSize: 11 }} />
              <Area type="monotone" dataKey="remaining" name="Remaining Budget" stroke="#d4762a" fill="url(#remainingGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenarios */}
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <h2 className="h-section px-5 pt-5 pb-3">Scenario Comparison</h2>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Price Change</th>
                <th className="right">New $/gal</th>
                <th className="right">Annual Cost</th>
                <th className="right">Over/Under Budget</th>
                <th className="right">With Hedge</th>
                <th className="right">Hedge Savings</th>
              </tr>
            </thead>
            <tbody>
              {data.scenarios.map((s) => {
                const isOver = s.over_budget > 0;
                return (
                  <tr key={s.price_change_pct}>
                    <td className="num font-semibold">{s.price_change_pct > 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%</td>
                    <td className="right num">${s.new_price.toFixed(3)}</td>
                    <td className="right num">{formatCurrency(s.annual_cost)}</td>
                    <td className="right num font-semibold" style={{ color: isOver ? "var(--negative)" : "var(--positive)" }}>
                      {isOver ? "+" : ""}{formatCurrency(s.over_budget)}
                    </td>
                    <td className="right num">{formatCurrency(s.hedged_annual_cost)}</td>
                    <td className="right num font-semibold" style={{ color: "var(--positive)" }}>
                      {s.hedge_savings > 0 ? formatCurrency(s.hedge_savings) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert */}
      {data.budget_status !== "healthy" && (
        <div className="surface p-5" style={{ background: statusTint, borderColor: statusTint }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: statusColor }} />
            <div>
              <h3 className="font-semibold text-[14px]" style={{ color: statusColor }}>
                {data.budget_status === "warning" ? "Budget Warning" : "Over Budget Alert"}
              </h3>
              <p className="text-[13px] mt-1 text-[color:var(--ink-2)] leading-relaxed">
                {data.budget_status === "warning"
                  ? `Fuel budget utilization is at ${data.budget_utilization_pct}%. At current prices, the client is approaching the annual budget limit. Hedging would lock in current prices and protect against further increases.`
                  : `Projected fuel costs exceed the annual budget by ${formatCurrency(data.annual_base_cost - data.annual_budget)}. Immediate action recommended — either increase the budget or implement a hedge to cap exposure.`}
              </p>
              <p className="text-[11px] mt-2 text-[color:var(--muted)] italic">
                {data.budget_status === "warning"
                  ? "Recommendation: hedge 50–75% of remaining fuel needs to cap downside."
                  : "Recommendation: hedge immediately at maximum ratio to limit further overrun."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="surface-deep p-7 text-center" style={{ borderRadius: "var(--radius-lg)" }}>
        <Shield className="h-9 w-9 mx-auto mb-3 text-[#e8893f]" />
        <h3 className="font-display text-[18px] font-bold text-white mb-1">Protect This Budget</h3>
        <p className="text-[13px] text-white/65 mb-4 max-w-md mx-auto">
          Lock in current fuel prices with a hedging strategy sized to this client&apos;s consumption and budget.
        </p>
        <a href={`/hedging/${companyId}`} className="btn btn-accent inline-flex">
          Start Hedging
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
