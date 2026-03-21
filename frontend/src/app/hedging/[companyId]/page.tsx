"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { hedgingApi, aiApi, companiesApi } from "@/lib/api";
import type { Company, StrategyRecommendation, ScenarioResult, AIResponse } from "@/lib/types";
import StrategyCard from "@/components/StrategyCard";
import ScenarioChart from "@/components/ScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import ErrorAlert from "@/components/ErrorAlert";
import { FileText, MessageSquare, Loader2 } from "lucide-react";

export default function HedgingPage() {
  const params = useParams();
  const companyId = Number(params.companyId);
  const [company, setCompany] = useState<Company | null>(null);
  const [recommendations, setRecommendations] = useState<StrategyRecommendation[]>([]);
  const [fuelPrice, setFuelPrice] = useState(0);
  const [monthlyGallons, setMonthlyGallons] = useState(0);
  const [selectedTier, setSelectedTier] = useState("moderate");
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [aiRec, setAiRec] = useState<AIResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      companiesApi.get(companyId),
      hedgingApi.recommend(companyId),
    ]).then(([c, rec]) => {
      setCompany(c);
      setRecommendations(rec.recommendations);
      setFuelPrice(rec.current_fuel_price);
      setMonthlyGallons(rec.monthly_gallons);
      loadScenarios(0.5, rec.recommendations[1]?.position?.product_ticker || "UGA");
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    }).finally(() => setLoading(false));
  }, [companyId]);

  async function loadScenarios(ratio: number, ticker: string) {
    try {
      const data = await hedgingApi.scenarios(companyId, ratio, ticker);
      setScenarios(data.scenarios);
    } catch (err) {
      console.error("Scenario load error:", err);
    }
  }

  async function getAIRecommendation() {
    setAiLoading(true);
    try {
      const data = await aiApi.recommend(companyId);
      setAiRec(data);
    } catch (err) {
      setAiRec({ response: `AI recommendation error: ${err instanceof Error ? err.message : String(err)}`, disclaimers: [] });
    } finally {
      setAiLoading(false);
    }
  }

  async function askQuestion() {
    if (!chatQuestion.trim()) return;
    setChatLoading(true);
    try {
      const data = await aiApi.ask(chatQuestion, companyId);
      setChatResponse(data.response);
    } catch (err) {
      setChatResponse(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setChatLoading(false);
    }
  }

  function handleTierSelect(tier: string) {
    setSelectedTier(tier);
    const strategy = recommendations.find((r) => r.tier === tier);
    if (strategy) {
      loadScenarios(strategy.hedge_ratio, strategy.product_ticker);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-64" />
          <div className="h-4 bg-gray-100 rounded w-96" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-48 bg-gray-100 rounded-lg" />
            <div className="h-48 bg-gray-100 rounded-lg" />
            <div className="h-48 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <ErrorAlert title="Failed to Load Hedging Data" message={error} suggestion="Check that the company exists and the API is running." onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const annualCost = monthlyGallons * 12 * fuelPrice;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hedging Strategies</h1>
          <p className="text-sm text-gray-500 mt-1">{company?.name}</p>
        </div>
        <Link href={`/reports/${companyId}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium">
          <FileText className="h-3.5 w-3.5" /> Full Report
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Monthly Gallons</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{monthlyGallons.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Current Price</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${fuelPrice.toFixed(3)}/gal</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Annual Fuel Cost</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Fuel Type</p>
          <p className="text-xl font-bold text-gray-900 mt-1 capitalize">{company?.fuel_type}</p>
        </div>
      </div>

      {/* Strategy Cards */}
      <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Select a Strategy</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {recommendations.map((r) => (
          <StrategyCard
            key={r.tier}
            strategy={r}
            selected={selectedTier === r.tier}
            onSelect={() => handleTierSelect(r.tier)}
          />
        ))}
      </div>

      {/* Scenario Analysis */}
      {scenarios.length > 0 && (
        <div className="mb-6">
          <ScenarioChart scenarios={scenarios} />
          <div className="mt-3 bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Cost Comparison at Different Price Levels</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Price Change</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">New Price</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Unhedged Cost</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Hedged Cost</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.price_change_pct} className="border-b border-gray-50">
                      <td className="py-2 px-3 text-gray-900 font-medium">{s.price_change_pct >= 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%</td>
                      <td className="py-2 px-3 text-right text-gray-700">${s.new_price_per_gallon.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right text-gray-700">${s.unhedged_annual_cost.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gray-700">${s.hedged_annual_cost.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right font-medium ${s.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {s.savings >= 0 ? "+" : ""}${s.savings.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Recommendation</h3>
            <button
              onClick={getAIRecommendation}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-xs disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {aiLoading ? "Analyzing..." : "Get AI Analysis"}
            </button>
          </div>
          {aiRec ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">{aiRec.response}</div>
          ) : (
            <p className="text-xs text-gray-400">Click &quot;Get AI Analysis&quot; for a personalized hedging recommendation powered by Claude.</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Ask About Hedging
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="e.g., What happens if gas prices drop after hedging?"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 outline-none"
            />
            <button
              onClick={askQuestion}
              disabled={chatLoading}
              className="px-3 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {chatLoading ? "..." : "Ask"}
            </button>
          </div>
          {chatResponse && (
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3 max-h-64 overflow-y-auto leading-relaxed">
              {chatResponse}
            </div>
          )}
        </div>
      </div>

      <ComplianceDisclaimer disclaimers={aiRec?.disclaimers} />
    </div>
  );
}
