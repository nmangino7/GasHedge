"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PriceCard from "@/components/PriceCard";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import ErrorAlert from "@/components/ErrorAlert";
import type { CurrentPrice, PricePoint } from "@/lib/types";
import { pricesApi, companiesApi } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus, Loader2, Building2, ArrowRight, Fuel } from "lucide-react";

export default function Dashboard() {
  const [prices, setPrices] = useState<CurrentPrice[]>([]);
  const [gasHistory, setGasHistory] = useState<PricePoint[]>([]);
  const [dieselHistory, setDieselHistory] = useState<PricePoint[]>([]);
  const [volatility, setVolatility] = useState<{ trend: string; annualized_volatility: number } | null>(null);
  const [companies, setCompanies] = useState<{ id: number; name: string; company_type: string; fuel_type: string; fleet_size: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyYears, setHistoryYears] = useState(3);

  useEffect(() => { loadData(); }, [historyYears]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [priceData, companyData] = await Promise.all([
        pricesApi.current(),
        companiesApi.list().catch(() => []),
      ]);
      setPrices(priceData.prices);
      setCompanies(companyData as typeof companies);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return;
    }

    try {
      const [gasHist, dieselHist, vol] = await Promise.allSettled([
        pricesApi.history("gasoline", "NUS", historyYears),
        pricesApi.history("diesel", "NUS", historyYears),
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
  const TrendIcon = volatility?.trend === "rising" ? TrendingUp : volatility?.trend === "falling" ? TrendingDown : Minus;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg mb-6">
            <Fuel className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-5 w-5 text-indigo-500 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Loading Market Data</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to EIA API...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="gradient-dark text-white rounded-2xl p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fuel Price Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Real-time data from the U.S. Energy Information Administration</p>
          </div>
          {volatility && (
            <div className={`mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              volatility.trend === "rising" ? "bg-rose-500/20 text-rose-300" :
              volatility.trend === "falling" ? "bg-emerald-500/20 text-emerald-300" :
              "bg-slate-500/20 text-slate-300"
            }`}>
              <TrendIcon className="h-4 w-4" />
              Market {volatility.trend.charAt(0).toUpperCase() + volatility.trend.slice(1)} | Vol: {(volatility.annualized_volatility * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Big Price Display */}
        {(nationalGas || nationalDiesel) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {nationalGas && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">National Gasoline</p>
                <div className="flex items-end gap-3 mt-2">
                  <span className="text-4xl font-bold">${nationalGas.price_per_gallon.toFixed(3)}</span>
                  <span className={`text-sm font-semibold mb-1 ${nationalGas.week_change >= 0 ? "text-rose-300" : "text-emerald-300"}`}>
                    {nationalGas.week_change >= 0 ? "+" : ""}{nationalGas.week_change.toFixed(3)} ({nationalGas.week_change_pct >= 0 ? "+" : ""}{nationalGas.week_change_pct.toFixed(1)}%)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">per gallon • weekly change</p>
              </div>
            )}
            {nationalDiesel && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">National Diesel</p>
                <div className="flex items-end gap-3 mt-2">
                  <span className="text-4xl font-bold">${nationalDiesel.price_per_gallon.toFixed(3)}</span>
                  <span className={`text-sm font-semibold mb-1 ${nationalDiesel.week_change >= 0 ? "text-rose-300" : "text-emerald-300"}`}>
                    {nationalDiesel.week_change >= 0 ? "+" : ""}{nationalDiesel.week_change.toFixed(3)} ({nationalDiesel.week_change_pct >= 0 ? "+" : ""}{nationalDiesel.week_change_pct.toFixed(1)}%)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">per gallon • weekly change</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <ErrorAlert title="API Error" message={error} suggestion="Check that EIA_API_KEY is set in Vercel environment variables." onRetry={loadData} />}

      {/* Regional Prices */}
      {prices.filter((p) => p.region !== "NUS").length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Regional Prices</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {prices.filter((p) => p.region !== "NUS").map((p) => (
              <PriceCard key={`${p.fuel_type}-${p.region}`} price={p} />
            ))}
          </div>
        </div>
      )}

      {/* Price History */}
      {(gasHistory.length > 0 || dieselHistory.length > 0) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Price History</h2>
            <div className="flex gap-1">
              {[1, 3, 5].map((y) => (
                <button key={y} onClick={() => setHistoryYears(y)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
                    historyYears === y ? "gradient-primary text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}>{y}Y</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {gasHistory.length > 0 && <PriceHistoryChart prices={gasHistory} label="Gasoline (U.S. Average)" />}
            {dieselHistory.length > 0 && <PriceHistoryChart prices={dieselHistory} label="Diesel (U.S. Average)" />}
          </div>
        </div>
      )}

      {/* Quick Access Companies */}
      {companies.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Your Companies</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {companies.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`}
                className="card card-lift p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{c.company_type.replace("_", " ")} • {c.fleet_size} vehicles</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
