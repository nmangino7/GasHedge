"use client";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ScenarioPoint {
  etf_price: number;
  implied_fuel_price: number;
  fuel_pct_change: number;
  unhedged_annual_cost: number;
  hedged_annual_cost: number;
  hedge_value: number;
  option_payoff: number;
  etf_payoff?: number;
  hedge_payoff?: number;
}

interface Props {
  scenarios: ScenarioPoint[];
  spotEtfPrice: number;
  breakevenEtfPrice?: number | null;
  height?: number;
}

const fmtMoney = (v: number) => `$${(v / 1000).toFixed(0)}k`;

export default function PayoffChart({
  scenarios,
  spotEtfPrice,
  breakevenEtfPrice,
  height = 320,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={scenarios} margin={{ top: 8, right: 24, left: 0, bottom: 16 }}>
        <defs>
          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d8a4b" stopOpacity={0.34} />
            <stop offset="100%" stopColor="#0d8a4b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c0392b" stopOpacity={0} />
            <stop offset="100%" stopColor="#c0392b" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis
          dataKey="etf_price"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          label={{
            value: "ETF price at expiry",
            position: "insideBottom",
            offset: -4,
            fill: "var(--muted)",
            fontSize: 10,
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickFormatter={fmtMoney}
          width={70}
          label={{
            value: "Annual fuel cost ($)",
            angle: -90,
            position: "insideLeft",
            fill: "var(--muted)",
            fontSize: 10,
            offset: 15,
          }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--ink)",
          }}
          formatter={(value, name) => {
            const n = typeof value === "number" ? value : Number(value);
            if (name === "Hedge value") {
              return [`${n >= 0 ? "+" : ""}$${n.toLocaleString()}`, "Hedge value"];
            }
            return [`$${n.toLocaleString()}`, String(name)];
          }}
          labelFormatter={(label) => `ETF $${Number(label).toFixed(2)}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />

        <Area
          type="monotone"
          dataKey="hedge_value"
          name="Hedge value"
          stroke="#0d8a4b"
          fill="url(#savingsGrad)"
          strokeWidth={2}
          yAxisId={0}
        />
        <Line
          type="monotone"
          dataKey="unhedged_annual_cost"
          name="Unhedged"
          stroke="#c0392b"
          strokeWidth={2}
          dot={false}
          yAxisId={0}
        />
        <Line
          type="monotone"
          dataKey="hedged_annual_cost"
          name="Hedged"
          stroke="#d4762a"
          strokeWidth={2.5}
          dot={false}
          yAxisId={0}
        />
        <ReferenceLine
          x={spotEtfPrice}
          stroke="var(--muted)"
          strokeDasharray="4 4"
          label={{ value: "Spot", fill: "var(--muted)", fontSize: 10, position: "top" }}
          yAxisId={0}
        />
        {breakevenEtfPrice != null && (
          <ReferenceLine
            x={breakevenEtfPrice}
            stroke="#0d8a4b"
            strokeDasharray="3 3"
            label={{
              value: "Breakeven",
              fill: "#0d8a4b",
              fontSize: 10,
              position: "top",
            }}
            yAxisId={0}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
