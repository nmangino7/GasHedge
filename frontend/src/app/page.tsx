"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Building2,
  Activity,
  DollarSign,
  Fuel,
  Sparkles,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { pricesApi, companiesApi, dealsApi, positionsApi } from "@/lib/api";
import type { CurrentPrice, PricePoint } from "@/lib/types";
import type { LiveTrackerResponse } from "@/lib/api";
import PriceHistoryChart from "@/components/PriceHistoryChart";

type CompanyLite = {
  id: number;
  name: string;
  company_type: string;
  fuel_type: string;
  fleet_size: number;
  monthly_gallons_gasoline?: number | null;
  monthly_gallons_diesel?: number | null;
  annual_revenue?: number | null;
};

export default function Dashboard() {
  const [prices, setPrices] = useState<CurrentPrice[]>([]);
  const [gasHistory, setGasHistory] = useState<PricePoint[]>([]);
  const [dieselHistory, setDieselHistory] = useState<PricePoint[]>([]);
  const [volatility, setVolatility] = useState<{ trend: string; annualized_volatility: number } | null>(null);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [deals, setDeals] = useState<{ id: number; status: string; annual_fee_revenue: number; company_id: number }[]>([]);
  const [live, setLive] = useState<LiveTrackerResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [priceData, companyData, dealsData, liveData] = await Promise.all([
        pricesApi.current().catch(() => ({ as_of: "", prices: [] as CurrentPrice[] })),
        companiesApi.list().catch(() => [] as CompanyLite[]),
        dealsApi.list().catch(() => []),
        positionsApi.live().catch(() => null),
      ]);
      setPrices(priceData.prices);
      setCompanies(companyData as CompanyLite[]);
      setDeals(dealsData);
      setLive(liveData);
    } catch {
      // already swallowed individually
    }
    try {
      const [gasHist, dieselHist, vol] = await Promise.allSettled([
        pricesApi.history("gasoline", "NUS", 3),
        pricesApi.history("diesel", "NUS", 3),
        pricesApi.volatility("gasoline", "NUS"),
      ]);
      if (gasHist.status === "fulfilled") setGasHistory(gasHist.value.prices);
      if (dieselHist.status === "fulfilled") setDieselHistory(dieselHist.value.prices);
      if (vol.status === "fulfilled") setVolatility(vol.value);
    } catch {}
    setLoading(false);
  }

  const nationalGas = prices.find((p) => p.region === "NUS" && p.fuel_type === "gasoline");
  const nationalDiesel = prices.find((p) => p.region === "NUS" && p.fuel_type === "diesel");
  const annualRevenue = deals
    .filter((d) => d.status === "active" || d.status === "signed")
    .reduce((acc, d) => acc + d.annual_fee_revenue, 0);
  const activeClients = new Set(
    deals.filter((d) => d.status === "active" || d.status === "signed").map((d) => d.company_id)
  ).size;

  const trendIcon = volatility?.trend === "rising" ? TrendingUp : volatility?.trend === "falling" ? TrendingDown : Minus;
  const TrendIconComponent = trendIcon;

  return (
    <div>
      {/* === Hero === */}
      <div className="surface-deep relative overflow-hidden mb-8 bg-grid" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="relative p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="pill pill-accent" style={{ background: "rgba(212, 118, 42, 0.18)", color: "#f4b07a" }}>
                  <Sparkles className="h-3 w-3" />
                  Advisory Platform
                </span>
                <span className="pill pill-live" style={{ background: "rgba(21, 163, 92, 0.18)", color: "#7fdfa6" }}>
                  Market Live
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
                Fuel Cost Risk Dashboard
              </h1>
              <p className="text-white/55 text-sm md:text-[15px] mt-2 max-w-xl leading-relaxed">
                Institutional-grade hedging strategies for small businesses. ETF + options coverage, live position
                tracking, and client-ready reports — all under one Series 65/66 advisory.
              </p>
            </div>
            {volatility && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-w-[200px]">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">
                  Gasoline 12M Vol
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white text-num">
                    {(volatility.annualized_volatility * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[12px] font-medium" style={{ color: volatility.trend === "rising" ? "#f4b07a" : volatility.trend === "falling" ? "#7fdfa6" : "rgba(255,255,255,0.6)" }}>
                  <TrendIconComponent className="h-3.5 w-3.5" />
                  Trend {volatility.trend}
                </div>
              </div>
            )}
          </div>

          {/* Big price tiles */}
          {(nationalGas || nationalDiesel) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {nationalGas && (
                <PriceTile
                  label="U.S. Average Gasoline"
                  price={nationalGas.price_per_gallon}
                  change={nationalGas.week_change}
                  changePct={nationalGas.week_change_pct}
                />
              )}
              {nationalDiesel && (
                <PriceTile
                  label="U.S. Average Diesel"
                  price={nationalDiesel.price_per_gallon}
                  change={nationalDiesel.week_change}
                  changePct={nationalDiesel.week_change_pct}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* === KPI strip === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          accent="accent"
          icon={<Building2 className="h-4 w-4" />}
          label="Active Clients"
          value={activeClients.toString()}
          sub={`${companies.length} total in book`}
        />
        <KpiCard
          accent="teal"
          icon={<DollarSign className="h-4 w-4" />}
          label="Annualized Revenue"
          value={`$${annualRevenue.toLocaleString()}`}
          sub={`${deals.filter((d) => d.status === "active" || d.status === "signed").length} signed deals`}
        />
        <KpiCard
          accent="positive"
          icon={<Activity className="h-4 w-4" />}
          label="Open Positions"
          value={(live?.aggregate.open_count ?? 0).toString()}
          sub={live?.aggregate.tickers.join(" · ") || "No positions yet"}
        />
        <KpiCard
          accent="ink"
          icon={<TrendingUp className="h-4 w-4" />}
          label="Unrealized P&L"
          value={
            live
              ? `${live.aggregate.total_unrealized_pnl >= 0 ? "+" : ""}$${Math.abs(live.aggregate.total_unrealized_pnl).toLocaleString()}`
              : "—"
          }
          sub={
            live
              ? `${live.aggregate.total_unrealized_pnl_pct >= 0 ? "+" : ""}${live.aggregate.total_unrealized_pnl_pct.toFixed(2)}% vs entry`
              : "Tracker idle"
          }
          valueColor={
            live
              ? live.aggregate.total_unrealized_pnl >= 0
                ? "var(--positive)"
                : "var(--negative)"
              : undefined
          }
        />
      </div>

      {/* === Two column: price charts + open positions teaser === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="h-section">Price History · 3 Year</h2>
            <Link href="/tracker" className="text-[12px] font-semibold text-[color:var(--accent)] hover:underline flex items-center gap-1">
              Open Live Tracker <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gasHistory.length > 0 && <PriceHistoryChart prices={gasHistory} label="Gasoline · U.S." />}
            {dieselHistory.length > 0 && <PriceHistoryChart prices={dieselHistory} label="Diesel · U.S." />}
          </div>
          {gasHistory.length === 0 && dieselHistory.length === 0 && !loading && (
            <div className="surface p-6 text-center text-[color:var(--muted)] text-sm">
              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
              Price history unavailable. Configure <code className="font-mono text-xs">EIA_API_KEY</code> in Settings.
            </div>
          )}
        </div>

        <div>
          <h2 className="h-section mb-3">Top Live Positions</h2>
          <div className="surface p-4">
            {live && live.positions.length > 0 ? (
              <ul className="space-y-3">
                {live.positions.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 pb-3 border-b border-[color:var(--line)] last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="ticker text-[13px]">{p.ticker}</span>
                        <span className={`pill ${p.side === "long" ? "pill-positive" : "pill-warning"}`}>
                          {p.side === "long" ? "LONG" : "SHORT"} {p.option_type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[color:var(--muted)] truncate mt-0.5">
                        ${p.strike.toFixed(2)} · {p.live.days_to_expiry}d · {p.company_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-num text-[13px] font-semibold"
                        style={{ color: p.live.unrealized_pnl >= 0 ? "var(--positive)" : "var(--negative)" }}
                      >
                        {p.live.unrealized_pnl >= 0 ? "+" : ""}${Math.abs(p.live.unrealized_pnl).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[color:var(--muted)]">
                        {p.live.unrealized_pnl_pct >= 0 ? "+" : ""}{p.live.unrealized_pnl_pct.toFixed(1)}%
                      </p>
                    </div>
                  </li>
                ))}
                <li>
                  <Link href="/tracker" className="btn btn-ghost btn-sm w-full justify-center">
                    View all {live.aggregate.open_count} positions
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-7 w-7 mx-auto text-[color:var(--muted-2)] mb-3" />
                <p className="text-sm font-semibold text-[color:var(--ink)]">No open positions</p>
                <p className="text-[12px] text-[color:var(--muted)] mt-1 mb-4">
                  Build a hedge for a client and track it here.
                </p>
                <Link href="/companies" className="btn btn-accent btn-sm">
                  Pick a client
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === Clients === */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="h-section">Client Book</h2>
          <Link href="/companies" className="text-[12px] font-semibold text-[color:var(--accent)] hover:underline flex items-center gap-1">
            All clients <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/companies/${c.id}`}
                className="surface-raised p-5 group flex items-start gap-4"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[color:var(--ink)] truncate group-hover:text-[color:var(--accent)]">
                    {c.name}
                  </p>
                  <p className="text-[12px] text-[color:var(--muted)] capitalize mt-0.5">
                    {c.company_type.replace(/_/g, " ")} · {c.fleet_size} vehicles
                  </p>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="pill pill-outline">
                      <Fuel className="h-3 w-3" />
                      {c.fuel_type}
                    </span>
                    {c.annual_revenue != null && (
                      <span className="pill pill-neutral">${(c.annual_revenue / 1000000).toFixed(1)}M rev</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="surface p-10 text-center">
            <Building2 className="h-9 w-9 mx-auto text-[color:var(--muted-2)] mb-3" />
            <p className="text-[14px] font-semibold text-[color:var(--ink)]">No clients yet</p>
            <p className="text-[12px] text-[color:var(--muted)] mt-1 mb-4">Add your first client to start building hedging plans.</p>
            <Link href="/companies/new" className="btn btn-accent">Add a client</Link>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[color:var(--muted-2)] mt-10 max-w-2xl">
        <BarChart3 className="h-3 w-3 inline-block mr-1" />
        Hedging recommendations are informational and constitute advice under a Series 65/66 registration. Securities
        recommended are registered investment products. Past performance does not guarantee future results.
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: "accent" | "teal" | "positive" | "ink";
  valueColor?: string;
}) {
  return (
    <div className={`kpi kpi-${accent}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="kpi-label">{label}</span>
        <span className="text-[color:var(--muted-2)]">{icon}</span>
      </div>
      <div className="kpi-value" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function PriceTile({
  label,
  price,
  change,
  changePct,
}: {
  label: string;
  price: number;
  change: number;
  changePct: number;
}) {
  const up = change >= 0;
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45">{label}</p>
      <div className="flex items-end gap-3 mt-2">
        <span className="text-[34px] font-bold text-white text-num tracking-tight">${price.toFixed(3)}</span>
        <span
          className="text-[13px] font-semibold mb-1 text-num"
          style={{ color: up ? "#f4b07a" : "#7fdfa6" }}
        >
          {up ? "+" : ""}{change.toFixed(3)} ({up ? "+" : ""}{changePct.toFixed(1)}%)
        </span>
      </div>
      <p className="text-[11px] text-white/45 mt-1">per gallon · weekly change</p>
    </div>
  );
}
