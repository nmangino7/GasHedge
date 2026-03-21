"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { PricePoint } from "@/lib/types";

export default function PriceHistoryChart({ prices, label }: { prices: PricePoint[]; label: string }) {
  const data = prices.map((p) => ({ date: p.period, price: p.value }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            domain={["dataMin - 0.2", "dataMax + 0.2"]}
          />
          <Tooltip
            formatter={(value: unknown) => [`$${Number(value).toFixed(3)}`, "Price/gal"]}
            labelFormatter={(l: unknown) => new Date(String(l)).toLocaleDateString()}
            contentStyle={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="price" stroke="#6366f1" fill="#eef2ff" fillOpacity={0.8} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
