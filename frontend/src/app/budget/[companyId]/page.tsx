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
      fetchBudget();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, budget, hedgeRatio]);

  async function fetchBudget() {
    try {
      setLoading(true);
      setError(null);
      const budgetParam = budget ? `&budget=${budget}` : "";
      const res = await fetch(
        `/api/budget/${companyId}?hedge_ratio=${hedgeRatio}${budgetParam}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch budget data");
      }
      const json = await res.json();
      setData(json);
      if (!budget && json.annual_budget) {
        setBudget(String(json.annual_budget));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const statusColors = {
    healthy: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-800",
      label: "Healthy",
    },
    warning: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-800",
      label: "Warning",
    },
    over: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      badge: "bg-rose-100 text-rose-800",
      label: "Over Budget",
    },
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <ErrorAlert
          title="Budget Calculation Error"
          message={error}
          suggestion="Please check the company ID and try again."
          onRetry={fetchBudget}
        />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return null;

  const status = statusColors[data.budget_status];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Calculator className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Fuel Budget Calculator
          </h1>
          <p className="text-sm text-slate-500">{data.company_name}</p>
        </div>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400 ml-2" />
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Annual Fuel Budget ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Enter annual budget"
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hedge Ratio
            </label>
            <div className="flex gap-2">
              {[
                { label: "25%", value: 0.25 },
                { label: "50%", value: 0.5 },
                { label: "75%", value: 0.75 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHedgeRatio(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    hedgeRatio === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Annual Budget
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(data.annual_budget)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Current Annual Cost
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(data.annual_base_cost)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Budget Utilization
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data.budget_utilization_pct}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Status
            </span>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${status.badge}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Burn-Down Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Budget Burn-Down
        </h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.burn_down}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: unknown) => [formatCurrency(Number(value))]}
                labelFormatter={(label: unknown) => `Month: ${label}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                }}
              />
              <ReferenceLine
                y={0}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: "Budget Exhausted", fill: "#ef4444", fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="remaining"
                name="Remaining Budget"
                stroke="#3b82f6"
                fill="#dbeafe"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenario Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Scenario Comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 font-medium text-slate-500">
                  Price Change
                </th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">
                  New $/gal
                </th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">
                  Annual Cost
                </th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">
                  Over/Under Budget
                </th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">
                  With Hedge
                </th>
                <th className="text-right py-3 px-3 font-medium text-slate-500">
                  Hedge Savings
                </th>
              </tr>
            </thead>
            <tbody>
              {data.scenarios.map((s) => {
                const isOver = s.over_budget > 0;
                const isHedgedOver = s.hedged_over_budget > 0;
                return (
                  <tr
                    key={s.price_change_pct}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-3 font-medium">
                      {s.price_change_pct > 0 ? "+" : ""}
                      {(s.price_change_pct * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      ${s.new_price.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {formatCurrency(s.annual_cost)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-medium ${
                        isOver ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isOver ? "+" : ""}
                      {formatCurrency(s.over_budget)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-medium ${
                        isHedgedOver ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(s.hedged_annual_cost)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                      {s.hedge_savings > 0
                        ? formatCurrency(s.hedge_savings)
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Alerts */}
      {data.budget_status !== "healthy" && (
        <div
          className={`rounded-xl border p-5 ${status.bg} ${status.border}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${status.text}`} />
            <div>
              <h3 className={`font-semibold ${status.text}`}>
                {data.budget_status === "warning"
                  ? "Budget Warning"
                  : "Over Budget Alert"}
              </h3>
              <p className={`text-sm mt-1 ${status.text}`}>
                {data.budget_status === "warning"
                  ? `Your fuel budget utilization is at ${data.budget_utilization_pct}%. At current prices, you are approaching your annual budget limit. Consider hedging to lock in current prices and protect against further increases.`
                  : `Your projected fuel costs exceed your annual budget by ${formatCurrency(data.annual_base_cost - data.annual_budget)}. Immediate action is recommended to either increase your budget or implement a hedging strategy to reduce cost exposure.`}
              </p>
              <p className={`text-xs mt-2 ${status.text} opacity-80`}>
                {data.budget_status === "warning"
                  ? "Recommendation: Hedge 50-75% of remaining fuel needs to cap downside risk."
                  : "Recommendation: Hedge immediately at maximum ratio to limit further budget overrun."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <Shield className="h-10 w-10 text-blue-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Protect Your Budget
        </h3>
        <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
          Lock in current fuel prices with a hedging strategy tailored to your
          consumption and budget.
        </p>
        <a
          href={`/hedging/${companyId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Shield className="h-4 w-4" />
          Start Hedging
        </a>
      </div>
    </div>
  );
}
