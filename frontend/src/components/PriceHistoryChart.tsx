"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { PricePoint } from "@/lib/types";

export default function PriceHistoryChart({ prices, label }: { prices: PricePoint[]; label: string }) {
  const data = prices.map((p) => ({
    date: p.period,
    price: p.value,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{label} — Price History</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v.toFixed(2)}`}
            domain={["dataMin - 0.2", "dataMax + 0.2"]}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(3)}`, "Price/gal"]}
            labelFormatter={(l) => new Date(l).toLocaleDateString()}
          />
          <Area type="monotone" dataKey="price" stroke="#2b6cb0" fill="#bee3f8" fillOpacity={0.4} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
