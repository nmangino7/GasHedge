"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Area, ComposedChart,
} from "recharts";
import type { ScenarioResult } from "@/lib/types";

const formatCurrency = (val: number) => `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default function ScenarioChart({ scenarios }: { scenarios: ScenarioResult[] }) {
  const data = scenarios.map((s) => ({
    label: `${s.price_change_pct >= 0 ? "+" : ""}${(s.price_change_pct * 100).toFixed(0)}%`,
    unhedged: s.unhedged_annual_cost,
    hedged: s.hedged_annual_cost,
    savings: s.savings,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Hedged vs. Unhedged Annual Fuel Cost
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} label={{ value: "Fuel Price Change", position: "insideBottom", offset: -5 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value)), name === "unhedged" ? "Unhedged Cost" : name === "hedged" ? "Hedged Cost" : "Savings"]}
          />
          <Legend />
          <Line type="monotone" dataKey="unhedged" name="Unhedged Cost" stroke="#e53e3e" strokeWidth={2.5} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="hedged" name="Hedged Cost" stroke="#48bb78" strokeWidth={2.5} dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
