"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { hedgingApi, aiApi, companiesApi } from "@/lib/api";
import type { Company, StrategyRecommendation, ScenarioResult, AIResponse } from "@/lib/types";
import StrategyCard from "@/components/StrategyCard";
import ScenarioChart from "@/components/ScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
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
    }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  async function loadScenarios(ratio: number, ticker: string) {
    try {
      const data = await hedgingApi.scenarios(companyId, ratio, ticker);
      setScenarios(data.scenarios);
    } catch {}
  }

  async function getAIRecommendation() {
    setAiLoading(true);
    try {
      const data = await aiApi.recommend(companyId);
      setAiRec(data);
    } catch {
      setAiRec({ response: "Unable to generate AI recommendation. Check your API key.", disclaimers: [] });
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
    } catch {
      setChatResponse("Unable to get answer. Check your API key.");
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

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-64 mb-4"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hedging Strategies</h1>
          <p className="text-gray-500 mt-1">{company?.name} — {monthlyGallons.toLocaleString()} gal/mo at ${fuelPrice.toFixed(3)}/gal</p>
        </div>
        <Link href={`/reports/${companyId}`}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
          <FileText className="h-4 w-4" /> Generate Report
        </Link>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <div className="mb-8">
          <ScenarioChart scenarios={scenarios} />
          <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Detailed Scenarios</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-500">Price Change</th>
                    <th className="text-right py-2 px-3 text-gray-500">New Price</th>
                    <th className="text-right py-2 px-3 text-gray-500">Unhedged Cost</th>
                    <th className="text-right py-2 px-3 text-gray-500">Hedged Cost</th>
                    <th className="text-right py-2 px-3 text-gray-500">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.price_change_pct} className="border-b border-gray-50">
                      <td className="py-2 px-3 font-medium">{s.price_change_pct >= 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%</td>
                      <td className="py-2 px-3 text-right">${s.new_price_per_gallon.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right">${s.unhedged_annual_cost.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">${s.hedged_annual_cost.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right font-medium ${s.savings >= 0 ? "text-green-600" : "text-red-500"}`}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* AI Recommendation */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">AI Recommendation</h3>
            <button
              onClick={getAIRecommendation}
              disabled={aiLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {aiLoading ? "Analyzing..." : "Get AI Analysis"}
            </button>
          </div>
          {aiRec ? (
            <div className="prose prose-sm max-w-none">
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{aiRec.response}</div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Click &quot;Get AI Analysis&quot; for a personalized hedging recommendation powered by Claude.</p>
          )}
        </div>

        {/* AI Chat */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Ask About Hedging
          </h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="e.g., What happens if gas prices drop after hedging?"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={askQuestion}
              disabled={chatLoading}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
            >
              {chatLoading ? "..." : "Ask"}
            </button>
          </div>
          {chatResponse && (
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              {chatResponse}
            </div>
          )}
        </div>
      </div>

      <ComplianceDisclaimer disclaimers={aiRec?.disclaimers} />
    </div>
  );
}
