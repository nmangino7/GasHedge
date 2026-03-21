"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { reportsApi, aiApi } from "@/lib/api";
import type { AIResponse, HedgePosition, ScenarioResult } from "@/lib/types";
import ScenarioChart from "@/components/ScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import ErrorAlert from "@/components/ErrorAlert";
import { FileText, Loader2, Download, TrendingUp, Target, DollarSign, Calendar, Wrench, BarChart3 } from "lucide-react";

interface DetailedReport {
  company: {
    id: number; name: string; company_type: string; fuel_type: string;
    fleet_size: number; region: string; monthly_gallons: number; annual_revenue: number | null;
  };
  current_price: number;
  strategies: {
    tier: string; product_ticker: string; product_name: string;
    hedge_ratio: number; position: HedgePosition; rationale: string;
  }[];
  selected_hedge_ratio: number;
  selected_ticker: string;
  hedge_position: HedgePosition;
  detailed_scenarios: {
    scenarios: ScenarioResult[];
    breakeven: { price_change_pct: number; fuel_price_per_gallon: number; description: string };
    monthly_projections: { month: string; unhedged_cost: number; hedged_cost: number; savings: number }[];
    annual_summary: { current_annual_cost: number; hedge_annual_expense: number; gallons_hedged: number; effective_coverage: number };
  };
  volatility: { annualized_volatility: number; trend: string; price_range_52w: { min: number; max: number } } | null;
}

export default function ReportsPage() {
  const params = useParams();
  const companyId = Number(params.companyId);
  const [hedgeRatio, setHedgeRatio] = useState(0.5);
  const [ticker, setTicker] = useState("UGA");
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [aiNarrative, setAiNarrative] = useState<AIResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("summary");

  async function generateReport() {
    setGenerating(true);
    setError(null);
    try {
      const data = await reportsApi.detailed(companyId, hedgeRatio, ticker);
      setReport(data);
      if (data.company.fuel_type === "diesel" && ticker === "UGA") {
        setTicker("USO");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function loadAI() {
    setAiLoading(true);
    try {
      const data = await aiApi.recommend(companyId);
      setAiNarrative(data);
    } catch (err) {
      setAiNarrative({ response: `AI error: ${err instanceof Error ? err.message : String(err)}`, disclaimers: [] });
    } finally {
      setAiLoading(false);
    }
  }

  function downloadReport() {
    const url = reportsApi.generateHtml(companyId, hedgeRatio, ticker);
    window.open(url, "_blank");
  }

  useEffect(() => {
    generateReport();
  }, [companyId]);

  const sections = [
    { id: "summary", label: "Summary", icon: BarChart3 },
    { id: "breakeven", label: "Breakeven", icon: Target },
    { id: "strategies", label: "Strategies", icon: TrendingUp },
    { id: "sensitivity", label: "Price Sensitivity", icon: BarChart3 },
    { id: "monthly", label: "Monthly Costs", icon: Calendar },
    { id: "implementation", label: "Implementation", icon: Wrench },
    { id: "ai", label: "AI Analysis", icon: FileText },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Detailed Hedging Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            {report ? `${report.company.name} — Comprehensive Analysis` : "Loading..."}
          </p>
        </div>
        {report && (
          <button onClick={downloadReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium">
            <Download className="h-3.5 w-3.5" /> Download Report
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Hedge Ratio</label>
            <div className="flex gap-1.5">
              {[
                { value: 0.25, label: "25%" },
                { value: 0.5, label: "50%" },
                { value: 0.75, label: "75%" },
              ].map((opt) => (
                <button key={opt.value} onClick={() => setHedgeRatio(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                    hedgeRatio === opt.value
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">ETF</label>
            <select value={ticker} onChange={(e) => setTicker(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 outline-none">
              <option value="UGA">UGA — Gasoline</option>
              <option value="USO">USO — Oil</option>
              <option value="BNO">BNO — Brent Oil</option>
            </select>
          </div>
          <button onClick={generateReport} disabled={generating}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium disabled:opacity-50">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {generating ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {error && <ErrorAlert title="Report Generation Failed" message={error} onRetry={generateReport} />}

      {report && (
        <>
          {/* Section Nav */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  activeSection === s.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            ))}
          </div>

          {/* Section 1: Executive Summary */}
          {activeSection === "summary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Fuel Type" value={report.company.fuel_type} capitalize />
                <MetricCard label="Monthly Gallons" value={report.company.monthly_gallons.toLocaleString()} />
                <MetricCard label="Current Price" value={`$${report.current_price.toFixed(3)}/gal`} />
                <MetricCard label="Annual Fuel Cost" value={`$${report.detailed_scenarios.annual_summary.current_annual_cost.toLocaleString()}`} />
                <MetricCard label="Fleet Size" value={`${report.company.fleet_size} vehicles`} />
                {report.company.annual_revenue && (
                  <MetricCard label="Fuel % Revenue"
                    value={`${((report.detailed_scenarios.annual_summary.current_annual_cost / report.company.annual_revenue) * 100).toFixed(1)}%`} />
                )}
              </div>

              {report.volatility && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Market Context</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Annualized Volatility</p>
                      <p className="text-lg font-bold text-gray-900">{report.volatility.annualized_volatility.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">52-Week Range</p>
                      <p className="text-lg font-bold text-gray-900">${report.volatility.price_range_52w.min.toFixed(2)} — ${report.volatility.price_range_52w.max.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Price Trend</p>
                      <p className={`text-lg font-bold capitalize ${report.volatility.trend === "rising" ? "text-red-600" : report.volatility.trend === "falling" ? "text-green-600" : "text-gray-900"}`}>
                        {report.volatility.trend}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-900 text-white rounded-lg p-6">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Recommendation</h3>
                <p className="text-lg leading-relaxed">
                  At ${report.current_price.toFixed(3)}/gal, a {(hedgeRatio * 100).toFixed(0)}% hedge using {ticker} requires{" "}
                  <strong>{report.hedge_position.shares_needed} shares</strong> (${report.hedge_position.dollar_notional.toLocaleString()}).
                  The hedge becomes profitable when prices rise above <strong>${report.detailed_scenarios.breakeven.fuel_price_per_gallon}/gal</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Section 2: Breakeven Analysis */}
          {activeSection === "breakeven" && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Target className="h-6 w-6 text-green-600 mt-1 shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-green-900">
                      Hedging saves money when {report.company.fuel_type} exceeds ${report.detailed_scenarios.breakeven.fuel_price_per_gallon}/gallon
                    </h2>
                    <p className="text-sm text-green-800 mt-2">{report.detailed_scenarios.breakeven.description}</p>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white/80 rounded-lg p-3">
                        <p className="text-[11px] text-green-700 uppercase">Current Price</p>
                        <p className="text-lg font-bold text-green-900">${report.current_price.toFixed(3)}</p>
                      </div>
                      <div className="bg-white/80 rounded-lg p-3">
                        <p className="text-[11px] text-green-700 uppercase">Breakeven Price</p>
                        <p className="text-lg font-bold text-green-900">${report.detailed_scenarios.breakeven.fuel_price_per_gallon}</p>
                      </div>
                      <div className="bg-white/80 rounded-lg p-3">
                        <p className="text-[11px] text-green-700 uppercase">Price Increase Needed</p>
                        <p className="text-lg font-bold text-green-900">+{(report.detailed_scenarios.breakeven.price_change_pct * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-white/80 rounded-lg p-3">
                        <p className="text-[11px] text-green-700 uppercase">Annual Hedge Cost</p>
                        <p className="text-lg font-bold text-green-900">${report.hedge_position.annual_expense_cost.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Breakeven by Strategy Tier</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {report.strategies.map((s) => {
                    const expCost = s.position.annual_expense_cost;
                    const notional = s.position.dollar_notional;
                    const corr = s.position.correlation_to_retail;
                    const beChange = notional > 0 && corr > 0 ? expCost / (notional * corr) : 0;
                    const bePrice = report.current_price * (1 + beChange);
                    return (
                      <div key={s.tier} className="border border-gray-200 rounded-lg p-4">
                        <p className="text-xs text-gray-500 uppercase font-medium">{s.tier}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">${bePrice.toFixed(3)}/gal</p>
                        <p className="text-xs text-gray-500 mt-1">+{(beChange * 100).toFixed(1)}% above current • {(s.hedge_ratio * 100)}% coverage</p>
                        <p className="text-xs text-gray-500 mt-0.5">Hedge cost: ${expCost.toLocaleString()}/yr</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Strategy Comparison */}
          {activeSection === "strategies" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Strategy Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Strategy</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Hedge %</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">ETF</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Shares</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Investment</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Annual Cost</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Correlation</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Eff. Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.strategies.map((s) => (
                        <tr key={s.tier} className="border-b border-gray-50">
                          <td className="py-3 px-3 text-gray-900 font-semibold capitalize">{s.tier}</td>
                          <td className="py-3 px-3 text-right">{(s.hedge_ratio * 100).toFixed(0)}%</td>
                          <td className="py-3 px-3 text-right font-medium">{s.product_ticker}</td>
                          <td className="py-3 px-3 text-right">{s.position.shares_needed}</td>
                          <td className="py-3 px-3 text-right">${s.position.dollar_notional.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right">${s.position.annual_expense_cost.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right">{(s.position.correlation_to_retail * 100).toFixed(0)}%</td>
                          <td className="py-3 px-3 text-right">{(s.position.effective_hedge_ratio * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {report.strategies.map((s) => (
                <div key={s.tier} className="bg-white rounded-lg border border-gray-200 p-5">
                  <h4 className="text-sm font-semibold text-gray-900 capitalize mb-2">{s.tier} Strategy</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.rationale}</p>
                </div>
              ))}
            </div>
          )}

          {/* Section 4: Price Sensitivity */}
          {activeSection === "sensitivity" && (
            <div className="space-y-4">
              <ScenarioChart scenarios={report.detailed_scenarios.scenarios} />
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Detailed Price Sensitivity — {(hedgeRatio * 100).toFixed(0)}% Hedge with {ticker}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Price Change</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">$/Gallon</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Unhedged Annual</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Hedged Annual</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Savings</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Savings %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.detailed_scenarios.scenarios.map((s) => (
                        <tr key={s.price_change_pct}
                          className={`border-b border-gray-50 ${Math.abs(s.price_change_pct) < 0.001 ? "bg-gray-50 font-medium" : ""}`}>
                          <td className="py-2 px-3 text-gray-900 font-medium">
                            {s.price_change_pct >= 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%
                          </td>
                          <td className="py-2 px-3 text-right text-gray-700">${s.new_price_per_gallon.toFixed(3)}</td>
                          <td className="py-2 px-3 text-right text-gray-700">${s.unhedged_annual_cost.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-gray-700">${s.hedged_annual_cost.toLocaleString()}</td>
                          <td className={`py-2 px-3 text-right font-medium ${s.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {s.savings >= 0 ? "+" : ""}${s.savings.toLocaleString()}
                          </td>
                          <td className={`py-2 px-3 text-right ${s.savings_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {s.savings_pct >= 0 ? "+" : ""}{s.savings_pct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Monthly Projections */}
          {activeSection === "monthly" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Monthly Cost Projections (at Current Prices)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Month</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Unhedged</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Hedged</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.detailed_scenarios.monthly_projections.map((m) => (
                        <tr key={m.month} className="border-b border-gray-50">
                          <td className="py-2 px-3 text-gray-900 font-medium">{m.month}</td>
                          <td className="py-2 px-3 text-right text-gray-700">${m.unhedged_cost.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-gray-700">${m.hedged_cost.toLocaleString()}</td>
                          <td className={`py-2 px-3 text-right font-medium ${m.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {m.savings >= 0 ? "+" : ""}${m.savings.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="py-3 px-3 text-gray-900">Annual Total</td>
                        <td className="py-3 px-3 text-right text-gray-900">${report.detailed_scenarios.annual_summary.current_annual_cost.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-gray-900">
                          ${(report.detailed_scenarios.annual_summary.current_annual_cost + report.detailed_scenarios.annual_summary.hedge_annual_expense).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-red-600">
                          -${report.detailed_scenarios.annual_summary.hedge_annual_expense.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900">Understanding the Monthly Cost</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  At current prices, the hedge has a net cost of ${report.hedge_position.annual_expense_cost.toLocaleString()}/year
                  (ETF expense ratio of {((report.hedge_position.annual_expense_cost / report.hedge_position.dollar_notional) * 100).toFixed(2)}%).
                  This is the cost of insurance — you pay a small premium for protection against price spikes.
                  When prices rise above ${report.detailed_scenarios.breakeven.fuel_price_per_gallon}/gal, the hedge starts generating net savings.
                </p>
              </div>
            </div>
          )}

          {/* Section 6: Implementation Guide */}
          {activeSection === "implementation" && (
            <div className="space-y-4">
              <div className="bg-gray-900 text-white rounded-lg p-6 mb-2">
                <h2 className="text-lg font-bold mb-2">Step-by-Step Implementation Guide</h2>
                <p className="text-sm text-gray-300">
                  Follow these steps to implement a {(hedgeRatio * 100).toFixed(0)}% fuel hedge for {report.company.name} using {ticker}.
                </p>
              </div>

              <ImplStep number={1} title="Open a Brokerage Account">
                <p>Open a standard taxable brokerage account. Recommended brokers:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Charles Schwab</strong> — $0 commissions, strong ETF platform</li>
                  <li><strong>Fidelity</strong> — $0 commissions, excellent research tools</li>
                  <li><strong>Interactive Brokers</strong> — Best for large positions, lowest margin rates</li>
                </ul>
                <p className="mt-2 text-gray-500">Account setup takes 1-3 business days. You need a standard brokerage account (not IRA).</p>
              </ImplStep>

              <ImplStep number={2} title="Fund the Account">
                <div className="bg-gray-100 rounded-lg p-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Required Capital</p>
                      <p className="text-2xl font-bold text-gray-900">${report.hedge_position.dollar_notional.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Number of Shares</p>
                      <p className="text-2xl font-bold text-gray-900">{report.hedge_position.shares_needed}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2">Fund via ACH transfer (2-3 business days, free) or wire transfer (same day, ~$25 fee).</p>
              </ImplStep>

              <ImplStep number={3} title="Place the Trade">
                <div className="bg-blue-50 rounded-lg p-4 mt-2 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Ticker:</span><span className="font-bold">{ticker}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Fund Name:</span><span className="font-bold">{report.hedge_position.product_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-bold">{report.hedge_position.shares_needed}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">~Price/Share:</span><span className="font-bold">${report.hedge_position.etf_price.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Order Type:</span><span className="font-bold">Limit Order</span></div>
                </div>
                <p className="mt-2">Place during market hours (9:30 AM - 4:00 PM ET). Use a <strong>limit order</strong> near the current market price to avoid slippage.</p>
              </ImplStep>

              <ImplStep number={4} title="Set Up Monitoring">
                <p>Track these weekly:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>ETF position value vs. actual fuel costs</li>
                  <li>Retail {report.company.fuel_type} price trends (EIA.gov weekly data)</li>
                  <li>ETF-to-fuel correlation — if it drops below 70%, consider switching ETFs</li>
                </ul>
                <p className="mt-2">Set price alerts on your broker platform for ±10% moves on both {ticker} and retail {report.company.fuel_type}.</p>
              </ImplStep>

              <ImplStep number={5} title="Quarterly Rebalancing">
                <p>Every quarter, recalculate your target:</p>
                <div className="bg-gray-100 rounded-lg p-3 mt-2 font-mono text-xs">
                  New Shares = (Monthly Gallons × Current Fuel Price × 12 × {(hedgeRatio * 100)}%) ÷ Current ETF Price
                </div>
                <p className="mt-2">If the difference between your current shares and the new target is more than 10%, buy or sell shares to rebalance.</p>
              </ImplStep>

              <ImplStep number={6} title="Cost Breakdown">
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">ETF Expense Ratio ({((report.hedge_position.annual_expense_cost / report.hedge_position.dollar_notional) * 100).toFixed(2)}%)</td>
                        <td className="py-2 text-right font-medium">${report.hedge_position.annual_expense_cost.toLocaleString()}/year</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Trading Commissions</td>
                        <td className="py-2 text-right font-medium">$0 (most major brokers)</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">Advisory Fee (typical)</td>
                        <td className="py-2 text-right font-medium">0.5-1.5% of AUM</td>
                      </tr>
                      <tr className="font-semibold">
                        <td className="py-2 text-gray-900">Total Hedge Cost (excl. advisory)</td>
                        <td className="py-2 text-right">${report.hedge_position.annual_expense_cost.toLocaleString()}/year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </ImplStep>

              <ImplStep number={7} title="Exit Strategy">
                <p>To unwind your hedge: sell all {report.hedge_position.shares_needed} shares of {ticker} during market hours using a limit order.</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Settlement: T+1 (cash available next business day)</li>
                  <li>Tax: {ticker} issues a K-1 form — gains taxed 60% long-term / 40% short-term regardless of holding period</li>
                  <li>Consult your accountant at year-end for K-1 filing</li>
                </ul>
              </ImplStep>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Implementation Timeline</h3>
                <div className="space-y-3">
                  {[
                    { week: "Week 1", action: "Open brokerage account, initiate funding" },
                    { week: "Week 2", action: "Account funded — place initial ETF purchase" },
                    { week: "Week 3", action: "Confirm position, set up alerts and monitoring" },
                    { week: "Monthly", action: "Review fuel costs vs ETF performance" },
                    { week: "Quarterly", action: "Rebalance if position drift exceeds 10%" },
                    { week: "Annually", action: "Full strategy review, file K-1 with taxes" },
                  ].map((item) => (
                    <div key={item.week} className="flex gap-4 items-center">
                      <span className="text-xs font-bold text-gray-900 w-20 shrink-0">{item.week}</span>
                      <div className="h-px bg-gray-200 w-4 shrink-0" />
                      <span className="text-sm text-gray-700">{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 7: AI Analysis */}
          {activeSection === "ai" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Strategy Analysis</h3>
                  <button onClick={loadAI} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-xs disabled:opacity-50">
                    {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {aiLoading ? "Analyzing..." : aiNarrative ? "Regenerate" : "Generate AI Analysis"}
                  </button>
                </div>
                {aiNarrative ? (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiNarrative.response}</div>
                ) : (
                  <p className="text-sm text-gray-400">Click &quot;Generate AI Analysis&quot; for a personalized recommendation powered by Claude AI.</p>
                )}
              </div>

              <ComplianceDisclaimer disclaimers={aiNarrative?.disclaimers} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold text-gray-900 mt-1 ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function ImplStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center justify-center w-7 h-7 bg-gray-900 text-white text-xs font-bold rounded-full shrink-0">{number}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed ml-10">{children}</div>
    </div>
  );
}
