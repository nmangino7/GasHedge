"use client";
import { ResponsiveContainer, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart } from "recharts";
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
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        Hedged vs. Unhedged Annual Fuel Cost
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: "#6b7280" }} />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value)), name === "unhedged" ? "Unhedged Cost" : name === "hedged" ? "Hedged Cost" : "Savings"]}
            contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="unhedged" name="Unhedged Cost" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="hedged" name="Hedged Cost" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
