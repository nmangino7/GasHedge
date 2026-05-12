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
  ReferenceArea,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PayoffRow {
  underlying_price: number;
  pnl_today: number;
  pnl_mid: number;
  pnl_expiry: number;
  implied_fuel_price?: number;
}

interface Props {
  rows: PayoffRow[];
  spot: number;
  breakevens: number[];
  daysToExpiry: number;
  height?: number;
  /** Show today / midway / expiry lines */
  showTimeSlices?: boolean;
  /** Show fuel-price secondary X axis */
  showFuelAxis?: boolean;
}

const fmt = (v: number) => {
  if (Math.abs(v) >= 1000) return `${v >= 0 ? "+" : ""}$${(v / 1000).toFixed(0)}k`;
  return `${v >= 0 ? "+" : ""}$${v}`;
};

export default function PayoffDiagram({
  rows,
  spot,
  breakevens,
  daysToExpiry,
  height = 380,
  showTimeSlices = true,
}: Props) {
  // Find the X range where pnl_expiry crosses zero — for colored zones
  const profitableZones: { from: number; to: number }[] = [];
  let zoneStart: number | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.pnl_expiry > 0 && zoneStart === null) {
      zoneStart = r.underlying_price;
    }
    if (r.pnl_expiry <= 0 && zoneStart !== null) {
      profitableZones.push({ from: zoneStart, to: r.underlying_price });
      zoneStart = null;
    }
  }
  if (zoneStart !== null && rows.length > 0) {
    profitableZones.push({ from: zoneStart, to: rows[rows.length - 1].underlying_price });
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 12, right: 20, left: 0, bottom: 18 }}>
        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d8a4b" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#0d8a4b" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c0392b" stopOpacity={0.02} />
            <stop offset="100%" stopColor="#c0392b" stopOpacity={0.18} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis
          dataKey="underlying_price"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          label={{
            value: "Underlying ETF price",
            position: "insideBottom",
            offset: -2,
            fill: "var(--muted)",
            fontSize: 10,
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickFormatter={fmt}
          width={70}
          label={{
            value: "Position P&L ($)",
            angle: -90,
            position: "insideLeft",
            fill: "var(--muted)",
            fontSize: 10,
            offset: 12,
          }}
        />

        {/* Profitable zones (green) */}
        {profitableZones.map((zone, i) => (
          <ReferenceArea
            key={`profit-${i}`}
            x1={zone.from}
            x2={zone.to}
            y1={0}
            fill="url(#profitGrad)"
            stroke="none"
          />
        ))}

        <ReferenceLine y={0} stroke="var(--muted-2)" strokeWidth={1} />

        {/* Time slice curves */}
        {showTimeSlices && (
          <Line
            type="monotone"
            dataKey="pnl_today"
            name={`Today (${daysToExpiry}d to expiry)`}
            stroke="#5b6477"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        )}
        {showTimeSlices && daysToExpiry > 4 && (
          <Line
            type="monotone"
            dataKey="pnl_mid"
            name={`Halfway (${Math.round(daysToExpiry / 2)}d to expiry)`}
            stroke="#d4762a"
            strokeWidth={1.8}
            strokeDasharray="2 2"
            dot={false}
          />
        )}
        <Line
          type="monotone"
          dataKey="pnl_expiry"
          name="At expiry"
          stroke="#0a0f1c"
          strokeWidth={3}
          dot={false}
        />

        {/* Spot line */}
        <ReferenceLine
          x={spot}
          stroke="var(--muted)"
          strokeDasharray="5 5"
          label={{
            value: `Spot $${spot.toFixed(2)}`,
            fill: "var(--muted)",
            fontSize: 10,
            position: "top",
          }}
        />

        {/* Breakeven lines */}
        {breakevens.map((b, i) => (
          <ReferenceLine
            key={`be-${i}`}
            x={b}
            stroke="#0d8a4b"
            strokeDasharray="3 3"
            label={{
              value: `BE $${b.toFixed(2)}`,
              fill: "#0d8a4b",
              fontSize: 10,
              position: i === 0 ? "top" : "insideTop",
            }}
          />
        ))}

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
            return [`${n >= 0 ? "+" : ""}$${n.toLocaleString()}`, String(name)];
          }}
          labelFormatter={(label, payload) => {
            const price = Number(label);
            const fuelEntry = payload?.[0]?.payload as PayoffRow | undefined;
            const fuel = fuelEntry?.implied_fuel_price;
            return fuel
              ? `Underlying $${price.toFixed(2)} · Implied fuel $${fuel.toFixed(3)}/gal`
              : `Underlying $${price.toFixed(2)}`;
          }}
        />

        <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
