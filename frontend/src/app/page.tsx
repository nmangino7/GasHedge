"use client";
import { useEffect, useState } from "react";
import PriceCard from "@/components/PriceCard";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import type { CurrentPrice, PricePoint } from "@/lib/types";
import { pricesApi } from "@/lib/api";
import { TrendingUp, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [prices, setPrices] = useState<CurrentPrice[]>([]);
  const [gasHistory, setGasHistory] = useState<PricePoint[]>([]);
  const [dieselHistory, setDieselHistory] = useState<PricePoint[]>([]);
  const [volatility, setVolatility] = useState<{ trend: string; annualized_volatility: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState("Connecting to EIA API...");
  const [error, setError] = useState<string | null>(null);
  const [historyYears, setHistoryYears] = useState(3);

  useEffect(() => {
    loadData();
  }, [historyYears]);

  async function loadData() {
    setLoading(true);
    setError(null);

    // Load prices first
    setLoadingStep("Fetching current fuel prices...");
    try {
      const priceData = await pricesApi.current();
      setPrices(priceData.prices);
      setLoadingStep(`Got ${priceData.prices.length} prices. Loading history...`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to load prices: ${msg}`);
      setLoading(false);
      return;
    }

    // Load history and volatility (don't block on failure)
    setLoadingStep("Loading price history...");
    try {
      const [gasHist, dieselHist, vol] = await Promise.allSettled([
        pricesApi.history("gasoline", "NUS", historyYears),
        pricesApi.history("diesel", "NUS", historyYears),
        pricesApi.volatility("gasoline", "NUS"),
      ]);

      if (gasHist.status === "fulfilled") setGasHistory(gasHist.value.prices);
      if (dieselHist.status === "fulfilled") setDieselHistory(dieselHist.value.prices);
      if (vol.status === "fulfilled") setVolatility(vol.value);
    } catch {
      // History failed but we still have current prices — that's OK
    }

    setLoading(false);
  }

  const nationalPrices = prices.filter((p) => p.region === "NUS");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Fuel Price Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time fuel prices from the U.S. Energy Information Administration</p>
      </div>

      {volatility && !loading && (
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 mb-1">API Error</p>
              <p className="text-sm text-red-700">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                Check that <code className="bg-red-100 px-1 py-0.5 rounded">EIA_API_KEY</code> is set in your Vercel environment variables and you&apos;ve redeployed after adding it.
              </p>
              <button
                onClick={loadData}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-xs font-medium hover:bg-red-200"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-700 mb-1">Loading Dashboard</p>
          <p className="text-xs text-gray-500">{loadingStep}</p>
          <p className="text-[11px] text-gray-400 mt-3">This may take 10-15 seconds on first load</p>
        </div>
      ) : (
        <>
          {prices.length === 0 && !error && (
            <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
              <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-gray-700 font-medium mb-1">No price data available</p>
              <p className="text-xs text-gray-500 mb-4">The EIA API returned no data. This usually means the API key is missing or invalid.</p>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md text-xs font-medium hover:bg-gray-800"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {nationalPrices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {nationalPrices.map((p) => (
                <PriceCard key={`${p.fuel_type}-${p.region}`} price={p} />
              ))}
            </div>
          )}

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

          {(gasHistory.length > 0 || dieselHistory.length > 0) && (
            <>
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
        </>
      )}
    </div>
  );
}
