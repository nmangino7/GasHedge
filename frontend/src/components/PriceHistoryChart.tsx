"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { PricePoint } from "@/lib/types";

export default function PriceHistoryChart({ prices, label }: { prices: PricePoint[]; label: string }) {
  const data = prices.map((p) => ({
    date: p.period,
    price: p.value,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-4">{label} — Price History</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => `$${v.toFixed(2)}`}
            domain={["dataMin - 0.2", "dataMax + 0.2"]}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(3)}`, "Price/gal"]}
            labelFormatter={(l) => new Date(l).toLocaleDateString()}
            contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6 }}
          />
          <Area type="monotone" dataKey="price" stroke="#374151" fill="#f3f4f6" fillOpacity={0.6} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
