"use client";
import { useEffect, useState } from "react";
import PriceCard from "@/components/PriceCard";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import type { CurrentPrice, PricePoint } from "@/lib/types";
import { pricesApi } from "@/lib/api";
import { TrendingUp, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const [prices, setPrices] = useState<CurrentPrice[]>([]);
  const [gasHistory, setGasHistory] = useState<PricePoint[]>([]);
  const [dieselHistory, setDieselHistory] = useState<PricePoint[]>([]);
  const [volatility, setVolatility] = useState<{ trend: string; annualized_volatility: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyYears, setHistoryYears] = useState(3);

  useEffect(() => {
    loadData();
  }, [historyYears]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [priceData, gasHist, dieselHist, vol] = await Promise.all([
        pricesApi.current(),
        pricesApi.history("gasoline", "NUS", historyYears),
        pricesApi.history("diesel", "NUS", historyYears),
        pricesApi.volatility("gasoline", "NUS"),
      ]);
      setPrices(priceData.prices);
      setGasHistory(gasHist.prices);
      setDieselHistory(dieselHist.prices);
      setVolatility(vol);
    } catch {
      setError("Unable to load price data. Check that EIA_API_KEY is configured in Vercel environment variables.");
    } finally {
      setLoading(false);
    }
  }

  const nationalPrices = prices.filter((p) => p.region === "NUS");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Fuel Price Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time fuel prices from the U.S. Energy Information Administration</p>
      </div>

      {volatility && (
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
            volatility.trend === "rising" ? "bg-red-50 text-red-700" :
            volatility.trend === "falling" ? "bg-green-50 text-green-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            <TrendingUp className="h-3.5 w-3.5" />
            Market: {volatility.trend.charAt(0).toUpperCase() + volatility.trend.slice(1)} | Volatility: {(volatility.annualized_volatility * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-20 mb-3"></div>
              <div className="h-7 bg-gray-100 rounded w-28"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {nationalPrices.map((p) => (
              <PriceCard key={`${p.fuel_type}-${p.region}`} price={p} />
            ))}
          </div>

          {prices.length > 2 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Regional Prices</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {prices.filter((p) => p.region !== "NUS").map((p) => (
                  <PriceCard key={`${p.fuel_type}-${p.region}`} price={p} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium text-gray-500">Timeframe:</span>
            {[1, 3, 5].map((y) => (
              <button
                key={y}
                onClick={() => setHistoryYears(y)}
                className={`px-3 py-1 text-xs rounded-md ${
                  historyYears === y
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {y}Y
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {gasHistory.length > 0 && <PriceHistoryChart prices={gasHistory} label="Gasoline (U.S. Average)" />}
            {dieselHistory.length > 0 && <PriceHistoryChart prices={dieselHistory} label="Diesel (U.S. Average)" />}
          </div>
        </>
      )}
    </div>
  );
}
