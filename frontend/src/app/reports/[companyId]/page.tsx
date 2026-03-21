"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { reportsApi, aiApi, pricesApi, hedgingApi } from "@/lib/api";
import type { AIResponse, HedgePosition, ScenarioResult, PricePoint } from "@/lib/types";
import ScenarioChart from "@/components/ScenarioChart";
import PriceScenarioChart from "@/components/PriceScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import ErrorAlert from "@/components/ErrorAlert";
import { FileText, Loader2, Download, TrendingUp, Target, Calendar, Wrench, BarChart3, GitCompare, Zap } from "lucide-react";

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
  const [deepReport, setDeepReport] = useState<AIResponse | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("summary");
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [allStrategies, setAllStrategies] = useState<Record<string, unknown> | null>(null);

  async function generateReport() {
    setGenerating(true);
    setError(null);
    try {
      const data = await reportsApi.detailed(companyId, hedgeRatio, ticker);
      setReport(data);
      if (data.company.fuel_type === "diesel" && ticker === "UGA") setTicker("USO");
      // Load price history and all strategies in parallel
      const [histData, stratData] = await Promise.all([
        pricesApi.history(data.company.fuel_type, data.company.region, 1).catch(() => ({ prices: [] })),
        hedgingApi.allStrategies(companyId, hedgeRatio).catch(() => null),
      ]);
      setPriceHistory(histData.prices || []);
      setAllStrategies(stratData);
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

  async function loadDeepReport() {
    setDeepLoading(true);
    try {
      const data = await aiApi.deepReport(companyId);
      setDeepReport(data);
    } catch (err) {
      setDeepReport({ response: `Error: ${err instanceof Error ? err.message : String(err)}`, disclaimers: [] });
    } finally {
      setDeepLoading(false);
    }
  }

  function downloadReport() {
    const url = reportsApi.generateHtml(companyId, hedgeRatio, ticker);
    window.open(url, "_blank");
  }

  useEffect(() => { generateReport(); }, [companyId]);

  const sections = [
    { id: "summary", label: "Summary", icon: BarChart3 },
    { id: "prices", label: "Price History", icon: TrendingUp },
    { id: "breakeven", label: "Breakeven", icon: Target },
    { id: "all-strategies", label: "All Strategies", icon: GitCompare },
    { id: "sensitivity", label: "Sensitivity", icon: BarChart3 },
    { id: "monthly", label: "Monthly", icon: Calendar },
    { id: "implementation", label: "Implementation", icon: Wrench },
    { id: "ai", label: "AI Analysis", icon: FileText },
    { id: "deep", label: "AI Deep Dive", icon: Zap },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comprehensive Hedging Report</h1>
          <p className="text-sm text-slate-500 mt-1">{report ? report.company.name : "Loading..."}</p>
        </div>
        {report && (
          <button onClick={downloadReport}
            className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-xl hover:opacity-90 text-sm font-semibold shadow-sm">
            <Download className="h-4 w-4" /> Download Report
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hedge Ratio</label>
            <div className="flex gap-1.5">
              {[{ value: 0.25, label: "25%" }, { value: 0.5, label: "50%" }, { value: 0.75, label: "75%" }].map((opt) => (
                <button key={opt.value} onClick={() => setHedgeRatio(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    hedgeRatio === opt.value
                      ? "gradient-primary text-white border-transparent shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ETF</label>
            <select value={ticker} onChange={(e) => setTicker(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="UGA">UGA — Gasoline</option>
              <option value="USO">USO — Oil</option>
              <option value="BNO">BNO — Brent Oil</option>
            </select>
          </div>
          <button onClick={generateReport} disabled={generating}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-semibold disabled:opacity-50">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {generating ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {error && <ErrorAlert title="Report Error" message={error} onRetry={generateReport} />}

      {report && (
        <>
          {/* Section Nav */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1.5 mb-6 overflow-x-auto no-print">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeSection === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            ))}
          </div>

          {/* Summary */}
          {activeSection === "summary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Fuel Type", value: report.company.fuel_type, capitalize: true },
                  { label: "Monthly Gallons", value: report.company.monthly_gallons.toLocaleString() },
                  { label: "Current Price", value: `$${report.current_price.toFixed(3)}/gal` },
                  { label: "Annual Cost", value: `$${report.detailed_scenarios.annual_summary.current_annual_cost.toLocaleString()}` },
                  { label: "Fleet", value: `${report.company.fleet_size} vehicles` },
                  ...(report.company.annual_revenue ? [{ label: "Fuel % Revenue", value: `${((report.detailed_scenarios.annual_summary.current_annual_cost / report.company.annual_revenue) * 100).toFixed(1)}%` }] : []),
                ].map((m) => (
                  <div key={m.label} className="card p-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{m.label}</p>
                    <p className={`text-lg font-bold text-slate-900 mt-1 ${m.capitalize ? "capitalize" : ""}`}>{m.value}</p>
                  </div>
                ))}
              </div>
              {report.volatility && (
                <div className="card p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Market Context</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="text-xs text-slate-500">Volatility</p><p className="text-xl font-bold text-slate-900">{report.volatility.annualized_volatility.toFixed(1)}%</p></div>
                    <div><p className="text-xs text-slate-500">52-Week Range</p><p className="text-xl font-bold text-slate-900">${report.volatility.price_range_52w.min.toFixed(2)} — ${report.volatility.price_range_52w.max.toFixed(2)}</p></div>
                    <div><p className="text-xs text-slate-500">Trend</p><p className={`text-xl font-bold capitalize ${report.volatility.trend === "rising" ? "text-rose-600" : report.volatility.trend === "falling" ? "text-emerald-600" : "text-slate-900"}`}>{report.volatility.trend}</p></div>
                  </div>
                </div>
              )}
              <div className="gradient-dark text-white rounded-xl p-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Finding</h3>
                <p className="text-lg leading-relaxed">
                  A {(hedgeRatio * 100).toFixed(0)}% hedge using {ticker} requires <strong>{report.hedge_position.shares_needed} shares</strong> (${report.hedge_position.dollar_notional.toLocaleString()}).
                  The hedge becomes profitable when prices rise above <strong>${report.detailed_scenarios.breakeven.fuel_price_per_gallon}/gal</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Price History */}
          {activeSection === "prices" && (
            <div className="space-y-4">
              <PriceScenarioChart
                historicalPrices={priceHistory}
                breakevenPrice={report.detailed_scenarios.breakeven.fuel_price_per_gallon}
                fuelType={report.company.fuel_type}
              />
              <p className="text-xs text-slate-500">Toggle scenario projections to see how different price trajectories affect your hedging strategy. The red dashed line shows your breakeven price.</p>
            </div>
          )}

          {/* Breakeven */}
          {activeSection === "breakeven" && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Target className="h-6 w-6 text-emerald-600 mt-1 shrink-0" />
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900">Hedging saves money when {report.company.fuel_type} exceeds ${report.detailed_scenarios.breakeven.fuel_price_per_gallon}/gal</h2>
                    <p className="text-sm text-emerald-800 mt-2">{report.detailed_scenarios.breakeven.description}</p>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Current Price", value: `$${report.current_price.toFixed(3)}` },
                        { label: "Breakeven Price", value: `$${report.detailed_scenarios.breakeven.fuel_price_per_gallon}` },
                        { label: "Increase Needed", value: `+${(report.detailed_scenarios.breakeven.price_change_pct * 100).toFixed(1)}%` },
                        { label: "Annual Hedge Cost", value: `$${report.hedge_position.annual_expense_cost.toLocaleString()}` },
                      ].map((m) => (
                        <div key={m.label} className="bg-white/80 rounded-lg p-3">
                          <p className="text-[10px] text-emerald-700 uppercase font-semibold">{m.label}</p>
                          <p className="text-lg font-bold text-emerald-900">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Breakeven by Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {report.strategies.map((s) => {
                    const expCost = s.position.annual_expense_cost;
                    const notional = s.position.dollar_notional;
                    const corr = s.position.correlation_to_retail;
                    const beChange = notional > 0 && corr > 0 ? expCost / (notional * corr) : 0;
                    const bePrice = report.current_price * (1 + beChange);
                    return (
                      <div key={s.tier} className="border border-slate-200 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase font-semibold">{s.tier}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">${bePrice.toFixed(3)}/gal</p>
                        <p className="text-xs text-slate-500 mt-1">+{(beChange * 100).toFixed(1)}% • {(s.hedge_ratio * 100)}% coverage • ${expCost.toLocaleString()}/yr</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* All Strategies Comparison */}
          {activeSection === "all-strategies" && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">All Hedging Approaches Compared</h3>
                {allStrategies ? (
                  <div className="overflow-x-auto">
                    <table className="w-full data-table">
                      <thead>
                        <tr>
                          <th className="text-left">Approach</th>
                          <th className="text-right">Annual Cost</th>
                          <th className="text-right">Capital Required</th>
                          <th>Max Loss</th>
                          <th>Correlation</th>
                          <th>Complexity</th>
                          <th>License</th>
                          <th>Best For</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((allStrategies as { comparison?: { approach: string; annual_cost: number; upfront_capital: number; max_loss: string; correlation: string; complexity: string; license: string; best_for: string }[] }).comparison || []).map((c) => (
                          <tr key={c.approach}>
                            <td className="font-semibold text-slate-900">{c.approach}</td>
                            <td className="text-right">${c.annual_cost.toLocaleString()}</td>
                            <td className="text-right">${c.upfront_capital.toLocaleString()}</td>
                            <td className="text-xs">{c.max_loss}</td>
                            <td>{c.correlation}</td>
                            <td><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.complexity === "Low" ? "bg-emerald-50 text-emerald-700" : c.complexity === "Medium" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{c.complexity}</span></td>
                            <td className="text-xs">{c.license}</td>
                            <td className="text-xs text-slate-600">{c.best_for}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Loading strategy comparison...</p>
                )}
              </div>

              {allStrategies && (
                <>
                  <div className="card p-5">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Options Strategy (Series 3 Required)</h4>
                    <p className="text-sm text-slate-600">{(allStrategies as { options?: { description: string } }).options?.description}</p>
                    <div className="mt-3 inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg">Requires Series 3 License</div>
                  </div>
                  <div className="card p-5">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Futures Strategy (Series 3 Required)</h4>
                    <p className="text-sm text-slate-600">{(allStrategies as { futures?: { description: string } }).futures?.description}</p>
                    <div className="mt-3 inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg">Requires Series 3 License</div>
                  </div>
                  <div className="card p-5">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Getting Your Series 3 License</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {[
                        { label: "Study Time", value: "~80 hours" },
                        { label: "Exam Fee", value: "$140" },
                        { label: "Passing Score", value: "70%" },
                        { label: "Administered By", value: "FINRA/NFA" },
                      ].map((m) => (
                        <div key={m.label} className="bg-slate-50 rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">{m.label}</p>
                          <p className="text-sm font-bold text-slate-900">{m.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">The Series 3 exam (National Commodity Futures Examination) covers futures markets, options on futures, regulations, and customer protection. Must be sponsored by an NFA member firm.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Price Sensitivity */}
          {activeSection === "sensitivity" && (
            <div className="space-y-4">
              <ScenarioChart scenarios={report.detailed_scenarios.scenarios} />
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detailed Price Sensitivity</h3>
                <div className="overflow-x-auto">
                  <table className="w-full data-table">
                    <thead><tr><th className="text-left">Change</th><th className="text-right">$/Gal</th><th className="text-right">Unhedged</th><th className="text-right">Hedged</th><th className="text-right">Savings</th><th className="text-right">%</th></tr></thead>
                    <tbody>
                      {report.detailed_scenarios.scenarios.map((s) => (
                        <tr key={s.price_change_pct} className={Math.abs(s.price_change_pct) < 0.001 ? "font-semibold bg-slate-50" : ""}>
                          <td className="font-semibold">{s.price_change_pct >= 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%</td>
                          <td className="text-right">${s.new_price_per_gallon.toFixed(3)}</td>
                          <td className="text-right">${s.unhedged_annual_cost.toLocaleString()}</td>
                          <td className="text-right">${s.hedged_annual_cost.toLocaleString()}</td>
                          <td className={`text-right font-semibold ${s.savings >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{s.savings >= 0 ? "+" : ""}${s.savings.toLocaleString()}</td>
                          <td className={`text-right ${s.savings_pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{s.savings_pct >= 0 ? "+" : ""}{s.savings_pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Monthly */}
          {activeSection === "monthly" && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Monthly Cost Projections</h3>
                <div className="overflow-x-auto">
                  <table className="w-full data-table">
                    <thead><tr><th className="text-left">Month</th><th className="text-right">Unhedged</th><th className="text-right">Hedged</th><th className="text-right">Difference</th></tr></thead>
                    <tbody>
                      {report.detailed_scenarios.monthly_projections.map((m) => (
                        <tr key={m.month}><td className="font-medium">{m.month}</td><td className="text-right">${m.unhedged_cost.toLocaleString()}</td><td className="text-right">${m.hedged_cost.toLocaleString()}</td><td className={`text-right font-semibold ${m.savings >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.savings >= 0 ? "+" : ""}${m.savings.toLocaleString()}</td></tr>
                      ))}
                      <tr className="font-bold bg-slate-50"><td>Annual Total</td><td className="text-right">${report.detailed_scenarios.annual_summary.current_annual_cost.toLocaleString()}</td><td className="text-right">${(report.detailed_scenarios.annual_summary.current_annual_cost + report.detailed_scenarios.annual_summary.hedge_annual_expense).toLocaleString()}</td><td className="text-right text-rose-600">-${report.detailed_scenarios.annual_summary.hedge_annual_expense.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Implementation */}
          {activeSection === "implementation" && (
            <div className="space-y-4">
              <div className="gradient-dark text-white rounded-xl p-6">
                <h2 className="text-lg font-bold mb-2">Step-by-Step Implementation Guide</h2>
                <p className="text-sm text-slate-300">Follow these steps to implement a {(hedgeRatio * 100).toFixed(0)}% fuel hedge using {ticker}.</p>
              </div>
              {[
                { n: 1, title: "Open a Brokerage Account", body: "Open a standard taxable account at Schwab, Fidelity, or Interactive Brokers. $0 commissions on ETF trades. 1-3 business days." },
                { n: 2, title: `Fund with $${report.hedge_position.dollar_notional.toLocaleString()}`, body: `Transfer funds to cover ${report.hedge_position.shares_needed} shares of ${ticker} at ~$${report.hedge_position.etf_price.toFixed(2)}/share. ACH (2-3 days) or wire (same day).` },
                { n: 3, title: `Buy ${report.hedge_position.shares_needed} shares of ${ticker}`, body: `Place a limit order during market hours (9:30 AM - 4:00 PM ET). ${report.hedge_position.product_name} has ${(report.hedge_position.correlation_to_retail * 100).toFixed(0)}% correlation to retail ${report.company.fuel_type}.` },
                { n: 4, title: "Set Up Monitoring", body: `Track weekly: ETF position value vs fuel costs, ${report.company.fuel_type} price trends from EIA.gov, correlation drift. Set ±10% price alerts.` },
                { n: 5, title: "Rebalance Quarterly", body: `Formula: (Monthly Gallons × Current Price × 12 × ${(hedgeRatio * 100)}%) ÷ ETF Price = Target Shares. Rebalance if >10% drift.` },
                { n: 6, title: "Costs", body: `ETF expense: $${report.hedge_position.annual_expense_cost.toLocaleString()}/yr (${((report.hedge_position.annual_expense_cost / report.hedge_position.dollar_notional) * 100).toFixed(2)}%). Trading: $0. Advisory: per agreement.` },
                { n: 7, title: "Exit Strategy", body: `Sell shares via limit order. Settlement T+1. ${ticker} issues K-1 — gains taxed 60% long-term / 40% short-term. Consult your accountant.` },
              ].map((step) => (
                <div key={step.n} className="card p-5 flex gap-4">
                  <span className="flex items-center justify-center w-8 h-8 gradient-primary text-white text-sm font-bold rounded-full shrink-0">{step.n}</span>
                  <div><h3 className="text-sm font-semibold text-slate-900">{step.title}</h3><p className="text-sm text-slate-600 mt-1">{step.body}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* AI Analysis */}
          {activeSection === "ai" && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Strategy Analysis</h3>
                  <button onClick={loadAI} disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg text-xs font-semibold disabled:opacity-50 shadow-sm">
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {aiLoading ? "Analyzing..." : aiNarrative ? "Regenerate" : "Generate Analysis"}
                  </button>
                </div>
                {aiNarrative ? (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{aiNarrative.response}</div>
                ) : (
                  <p className="text-sm text-slate-400">Click to generate a personalized AI recommendation.</p>
                )}
              </div>
              <ComplianceDisclaimer disclaimers={aiNarrative?.disclaimers} />
            </div>
          )}

          {/* AI Deep Dive */}
          {activeSection === "deep" && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Deep Dive Report</h3>
                    <p className="text-xs text-slate-400 mt-1">Comprehensive 10-section analysis covering ETFs, options, futures, and licensing</p>
                  </div>
                  <button onClick={loadDeepReport} disabled={deepLoading}
                    className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg text-xs font-semibold disabled:opacity-50 shadow-sm">
                    {deepLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    {deepLoading ? "Generating (30-60s)..." : deepReport ? "Regenerate" : "Generate Deep Report"}
                  </button>
                </div>
                {deepReport ? (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">{deepReport.response}</div>
                ) : (
                  <div className="bg-indigo-50 rounded-xl p-6 text-center">
                    <Zap className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-indigo-900">AI-Powered Deep Analysis</p>
                    <p className="text-xs text-indigo-700 mt-1">Generates a comprehensive advisory report covering all hedging approaches, licensing requirements, cost-benefit analysis, and implementation roadmap.</p>
                  </div>
                )}
              </div>
              <ComplianceDisclaimer disclaimers={deepReport?.disclaimers} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
