"use client";
import { useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

interface PricePoint {
  period: string;
  value: number;
}

interface PriceScenarioChartProps {
  historicalPrices: PricePoint[];
  breakevenPrice?: number;
  fuelType: string;
}

const SCENARIO_COLORS: Record<string, string> = {
  "-10%": "#10b981",
  "Flat": "#6b7280",
  "+10%": "#f59e0b",
  "+20%": "#f97316",
  "+30%": "#ef4444",
};

export default function PriceScenarioChart({ historicalPrices, breakevenPrice, fuelType }: PriceScenarioChartProps) {
  const [activeScenarios, setActiveScenarios] = useState<Record<string, boolean>>({
    "-10%": true, "Flat": true, "+10%": true, "+20%": true, "+30%": true,
  });

  if (historicalPrices.length === 0) {
    return <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-sm text-slate-500">No price history available.</div>;
  }

  const lastPrice = historicalPrices[historicalPrices.length - 1].value;
  const lastDate = new Date(historicalPrices[historicalPrices.length - 1].period);

  // Build chart data: historical + 12 months of projections
  const chartData = historicalPrices.slice(-52).map((p) => ({
    date: p.period.slice(0, 7),
    price: p.value,
    type: "historical" as const,
  }));

  // Add projection months
  const scenarios = [
    { key: "-10%", rate: -0.10 },
    { key: "Flat", rate: 0 },
    { key: "+10%", rate: 0.10 },
    { key: "+20%", rate: 0.20 },
    { key: "+30%", rate: 0.30 },
  ];

  for (let m = 1; m <= 12; m++) {
    const projDate = new Date(lastDate);
    projDate.setMonth(projDate.getMonth() + m);
    const label = projDate.toISOString().slice(0, 7);
    const point: Record<string, string | number | undefined> = { date: label, type: "projected" };
    for (const s of scenarios) {
      if (activeScenarios[s.key]) {
        point[s.key] = Math.round(lastPrice * (1 + (s.rate * m / 12)) * 1000) / 1000;
      }
    }
    chartData.push(point as typeof chartData[number]);
  }

  function toggleScenario(key: string) {
    setActiveScenarios((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Price History & Scenarios</h3>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{fuelType} — 1 Year History + 12 Month Projections</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {scenarios.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleScenario(s.key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                activeScenarios[s.key]
                  ? "border-transparent text-white"
                  : "border-slate-200 text-slate-400 bg-white"
              }`}
              style={activeScenarios[s.key] ? { backgroundColor: SCENARIO_COLORS[s.key] } : {}}
            >
              {s.key}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(value: unknown) => [`$${Number(value).toFixed(3)}`, ""]}
          />

          {/* Historical price area */}
          <Area
            type="monotone"
            dataKey="price"
            stroke="#6366f1"
            fill="#eef2ff"
            strokeWidth={2}
            name="Historical"
          />

          {/* Scenario projection lines */}
          {scenarios.map((s) =>
            activeScenarios[s.key] ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={SCENARIO_COLORS[s.key]}
                strokeWidth={2}
                strokeDasharray={s.key === "Flat" ? "5 5" : undefined}
                dot={false}
                name={s.key}
                connectNulls={false}
              />
            ) : null
          )}

          {/* Breakeven reference line */}
          {breakevenPrice && (
            <ReferenceLine
              y={breakevenPrice}
              stroke="#dc2626"
              strokeDasharray="8 4"
              strokeWidth={1.5}
              label={{
                value: `Breakeven $${breakevenPrice.toFixed(3)}`,
                position: "right",
                fill: "#dc2626",
                fontSize: 11,
              }}
            />
          )}

          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
