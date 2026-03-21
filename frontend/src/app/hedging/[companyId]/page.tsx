"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { hedgingApi, aiApi, companiesApi } from "@/lib/api";
import type { Company, StrategyRecommendation, ScenarioResult, AIResponse, AnnuityOption } from "@/lib/types";
import StrategyCard from "@/components/StrategyCard";
import ScenarioChart from "@/components/ScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import { FileText, MessageSquare, Loader2, AlertTriangle, Shield, DollarSign, Clock } from "lucide-react";

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
  const [annuityOptions, setAnnuityOptions] = useState<AnnuityOption[]>([]);
  const [showAnnuities, setShowAnnuities] = useState(false);
  const [expandedAnnuity, setExpandedAnnuity] = useState<string | null>(null);
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
      setAnnuityOptions(rec.annuity_options || []);
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
      setAiRec({ response: "Unable to generate AI recommendation. Check your ANTHROPIC_API_KEY.", disclaimers: [] });
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
      setChatResponse("Unable to get answer. Check your ANTHROPIC_API_KEY.");
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

  if (loading) return <div className="animate-pulse"><div className="h-6 bg-gray-100 rounded w-64 mb-4"></div></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Hedging Strategies</h1>
          <p className="text-sm text-gray-500 mt-1">{company?.name} — {monthlyGallons.toLocaleString()} gal/mo at ${fuelPrice.toFixed(3)}/gal</p>
        </div>
        <Link href={`/reports/${companyId}`}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">
          <FileText className="h-3.5 w-3.5" /> Report
        </Link>
      </div>

      {/* Strategy Cards */}
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
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Detailed Scenarios</h3>
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

      {/* Annuity Options */}
      {annuityOptions.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowAnnuities(!showAnnuities)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-900">Annuity Hedging Options</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">Alternative</span>
            </div>
            <span className="text-xs text-gray-500">{showAnnuities ? "Hide" : "Show options"}</span>
          </button>

          {showAnnuities && (
            <div className="mt-3 space-y-4">
              {/* 59½ Rule Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Early Withdrawal: Age 59½ Rule</h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Annuity withdrawals before age 59½ incur a <strong>10% IRS early withdrawal penalty</strong> on gains,
                      in addition to ordinary income tax. However, business owners <strong>can still pull money out</strong> —
                      you are not locked in. Here&apos;s how:
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-800">
                      <li className="flex gap-1.5">
                        <span className="font-medium shrink-0">•</span>
                        <span><strong>Free withdrawal allowance:</strong> Most annuities allow 10% of the account value per year penalty-free from the insurer (IRS penalty still applies if under 59½)</span>
                      </li>
                      <li className="flex gap-1.5">
                        <span className="font-medium shrink-0">•</span>
                        <span><strong>72(t) / SEPP distributions:</strong> Substantially Equal Periodic Payments can avoid the 10% IRS penalty at any age</span>
                      </li>
                      <li className="flex gap-1.5">
                        <span className="font-medium shrink-0">•</span>
                        <span><strong>Full surrender:</strong> You can always cash out entirely — you&apos;ll pay surrender charges (see schedule below) plus the 10% IRS penalty on gains if under 59½</span>
                      </li>
                      <li className="flex gap-1.5">
                        <span className="font-medium shrink-0">•</span>
                        <span><strong>1035 Exchange:</strong> Transfer to a different annuity without tax consequences</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Annuity Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {annuityOptions.map((opt) => (
                  <div
                    key={opt.type}
                    className="bg-white rounded-lg border border-gray-200 p-5 hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {opt.type === "variable" ? "Variable" : "Fixed Indexed"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        opt.liquidity_rating === "low" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                      }`}>
                        {opt.liquidity_rating === "low" ? "Low Liquidity" : "Liquid"}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{opt.label}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{opt.description}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Premium</span>
                        <span className="text-gray-900 font-medium">${opt.estimated_premium.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Annual Fees</span>
                        <span className="text-gray-900 font-medium">{opt.annual_fees_pct}% (${opt.annual_fee_dollar.toLocaleString()})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Surrender Period</span>
                        <span className="text-gray-900 font-medium">{opt.surrender_period_years} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Free Withdrawal</span>
                        <span className="text-gray-900 font-medium">{opt.free_withdrawal_pct}%/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">IRS Penalty (under 59½)</span>
                        <span className="text-red-600 font-medium">{opt.early_withdrawal_penalty_pct}% on gains</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tax Deferred</span>
                        <span className="text-green-600 font-medium">Yes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Exposure</span>
                        <span className="text-gray-900 font-medium text-xs text-right max-w-[180px]">{opt.commodity_exposure}</span>
                      </div>
                    </div>

                    {/* Surrender Schedule Toggle */}
                    <button
                      onClick={() => setExpandedAnnuity(expandedAnnuity === opt.type ? null : opt.type)}
                      className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {expandedAnnuity === opt.type ? "Hide" : "Show"} Surrender Schedule
                    </button>

                    {expandedAnnuity === opt.type && (
                      <div className="mt-2 bg-gray-50 rounded-md p-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1 text-gray-500 font-medium">Year</th>
                              <th className="text-right py-1 text-gray-500 font-medium">Surrender Charge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {opt.surrender_schedule.map((s) => (
                              <tr key={s.year} className="border-b border-gray-100">
                                <td className="py-1 text-gray-700">Year {s.year}</td>
                                <td className="py-1 text-right text-gray-700">{s.charge_pct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ETF vs Annuity Comparison */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">ETF vs Annuity Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Feature</th>
                        <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">ETF (UGA/USO)</th>
                        <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Variable Annuity</th>
                        <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Fixed Indexed Annuity</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-700 font-medium">Liquidity</td>
                        <td className="py-2 px-3 text-center text-green-600 font-medium">Sell anytime</td>
                        <td className="py-2 px-3 text-center text-red-600">Surrender charges apply</td>
                        <td className="py-2 px-3 text-center text-red-600">Surrender charges apply</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-700 font-medium">Annual Fees</td>
                        <td className="py-2 px-3 text-center text-green-600">~0.8-1.0%</td>
                        <td className="py-2 px-3 text-center text-amber-600">~2.0-2.5%</td>
                        <td className="py-2 px-3 text-center text-amber-600">~1.5%</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-700 font-medium">Tax Treatment</td>
                        <td className="py-2 px-3 text-center text-gray-600">Capital gains + K-1</td>
                        <td className="py-2 px-3 text-center text-green-600">Tax-deferred growth</td>
                        <td className="py-2 px-3 text-center text-green-600">Tax-deferred growth</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-700 font-medium">Age 59½ Penalty</td>
                        <td className="py-2 px-3 text-center text-green-600 font-medium">None</td>
                        <td className="py-2 px-3 text-center text-red-600">10% IRS penalty</td>
                        <td className="py-2 px-3 text-center text-red-600">10% IRS penalty</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-700 font-medium">Principal Protection</td>
                        <td className="py-2 px-3 text-center text-red-600">No</td>
                        <td className="py-2 px-3 text-center text-red-600">No</td>
                        <td className="py-2 px-3 text-center text-green-600 font-medium">Yes (0% floor)</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-700 font-medium">Fuel Price Correlation</td>
                        <td className="py-2 px-3 text-center text-green-600 font-medium">High (78-88%)</td>
                        <td className="py-2 px-3 text-center text-amber-600">Moderate (varies)</td>
                        <td className="py-2 px-3 text-center text-amber-600">Low-Moderate (capped)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-gray-700 font-medium">Best For</td>
                        <td className="py-2 px-3 text-center text-gray-600">Active hedging, full liquidity</td>
                        <td className="py-2 px-3 text-center text-gray-600">Tax-deferred, long-term</td>
                        <td className="py-2 px-3 text-center text-gray-600">Conservative, principal safety</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
