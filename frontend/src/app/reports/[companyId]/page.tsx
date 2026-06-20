"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { reportsApi, aiApi, pricesApi, hedgingApi } from "@/lib/api";
import type { AIResponse, HedgePosition, ScenarioResult, PricePoint } from "@/lib/types";
import ScenarioChart from "@/components/ScenarioChart";
import PriceScenarioChart from "@/components/PriceScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import ErrorAlert from "@/components/ErrorAlert";
import {
  FileText,
  Loader2,
  Download,
  TrendingUp,
  Target,
  Calendar,
  Wrench,
  BarChart3,
  GitCompare,
  Zap,
  Sparkles,
  Presentation,
} from "lucide-react";

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

  useEffect(() => { void generateReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyId]);

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
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <span className="h-section">Client Report</span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">
            {report ? report.company.name : "Loading..."}
          </h1>
          <p className="text-sm text-[color:var(--muted)] mt-1.5">
            Comprehensive hedging deliverable · ready to print or share with the client
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href={`/api/reports/client-plan/${companyId}?coverage=${hedgeRatio}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            title="Branded client PDF (corrected numbers, print/save as PDF)"
          >
            <FileText className="h-4 w-4" /> Client PDF
          </a>
          <a
            href={`/api/reports/deck/${companyId}?coverage=${hedgeRatio}`}
            className="btn btn-ghost"
            title="Download a branded PowerPoint client deck"
          >
            <Presentation className="h-4 w-4" /> PowerPoint deck
          </a>
          {report && (
            <button onClick={downloadReport} className="btn btn-primary">
              <Download className="h-4 w-4" /> Download Report
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="surface p-5 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1.5">Hedge Ratio</label>
            <div className="flex gap-1.5">
              {[
                { value: 0.25, label: "25%" },
                { value: 0.5, label: "50%" },
                { value: 0.75, label: "75%" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHedgeRatio(opt.value)}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                  style={{
                    background: hedgeRatio === opt.value ? "var(--accent)" : "transparent",
                    color: hedgeRatio === opt.value ? "#fff" : "var(--ink-2)",
                    border: `1px solid ${hedgeRatio === opt.value ? "var(--accent)" : "var(--line)"}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-1.5">ETF</label>
            <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="select">
              <option value="UGA">UGA — Gasoline</option>
              <option value="USO">USO — Oil</option>
              <option value="BNO">BNO — Brent Oil</option>
            </select>
          </div>
          <button onClick={generateReport} disabled={generating} className="btn btn-primary">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {generating ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {error && <ErrorAlert title="Report Error" message={error} onRetry={generateReport} />}

      {report && (
        <>
          {/* Tab nav */}
          <div className="flex gap-1 surface p-1 mb-6 overflow-x-auto no-print" style={{ background: "var(--bg)" }}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors"
                style={{
                  background: activeSection === s.id ? "var(--bg-elev)" : "transparent",
                  color: activeSection === s.id ? "var(--ink)" : "var(--muted)",
                  boxShadow: activeSection === s.id ? "var(--shadow-xs)" : undefined,
                }}
              >
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            ))}
          </div>

          {activeSection === "summary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Fuel Type", value: report.company.fuel_type, capitalize: true },
                  { label: "Monthly Gallons", value: report.company.monthly_gallons.toLocaleString() },
                  { label: "Current Price", value: `$${report.current_price.toFixed(3)}/gal` },
                  { label: "Annual Cost", value: `$${report.detailed_scenarios.annual_summary.current_annual_cost.toLocaleString()}` },
                  { label: "Fleet", value: `${report.company.fleet_size} vehicles` },
                  ...(report.company.annual_revenue
                    ? [{ label: "Fuel % Revenue", value: `${((report.detailed_scenarios.annual_summary.current_annual_cost / report.company.annual_revenue) * 100).toFixed(1)}%` }]
                    : []),
                ].map((m) => (
                  <div key={m.label} className="surface p-4">
                    <p className="text-[10px] text-[color:var(--muted)] uppercase tracking-wider font-semibold">{m.label}</p>
                    <p className={`text-num text-[16px] font-bold text-[color:var(--ink)] mt-1 ${m.capitalize ? "capitalize" : ""}`}>{m.value}</p>
                  </div>
                ))}
              </div>
              {report.volatility && (
                <div className="surface p-5">
                  <h3 className="h-section mb-3">Market Context</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[11px] text-[color:var(--muted)]">Volatility</p>
                      <p className="text-num text-[20px] font-bold text-[color:var(--ink)]">{report.volatility.annualized_volatility.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--muted)]">52-Week Range</p>
                      <p className="text-num text-[20px] font-bold text-[color:var(--ink)]">${report.volatility.price_range_52w.min.toFixed(2)} – ${report.volatility.price_range_52w.max.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--muted)]">Trend</p>
                      <p
                        className="text-[20px] font-bold capitalize"
                        style={{
                          color:
                            report.volatility.trend === "rising"
                              ? "var(--negative)"
                              : report.volatility.trend === "falling"
                              ? "var(--positive)"
                              : "var(--ink)",
                        }}
                      >
                        {report.volatility.trend}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="surface-deep p-6" style={{ borderRadius: "var(--radius-lg)" }}>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Key Finding
                </h3>
                <p className="text-[16px] leading-relaxed text-white">
                  A {(hedgeRatio * 100).toFixed(0)}% hedge using <span className="text-[#f4b07a] font-semibold">{ticker}</span> requires{" "}
                  <strong>{report.hedge_position.shares_needed.toLocaleString()} shares</strong>{" "}
                  (${report.hedge_position.dollar_notional.toLocaleString()}).
                  The hedge becomes profitable when prices rise above{" "}
                  <strong className="text-[#7fdfa6]">${report.detailed_scenarios.breakeven.fuel_price_per_gallon}/gal</strong>.
                </p>
              </div>
            </div>
          )}

          {activeSection === "prices" && (
            <div className="space-y-4">
              <PriceScenarioChart
                historicalPrices={priceHistory}
                breakevenPrice={report.detailed_scenarios.breakeven.fuel_price_per_gallon}
                fuelType={report.company.fuel_type}
              />
              <p className="text-[11px] text-[color:var(--muted)]">
                Toggle scenario projections to see how different price trajectories affect this hedge. The red dashed line is the breakeven.
              </p>
            </div>
          )}

          {activeSection === "breakeven" && (
            <div className="space-y-4">
              <div
                className="surface p-6"
                style={{ background: "var(--positive-tint)", borderColor: "var(--positive)" }}
              >
                <div className="flex items-start gap-3">
                  <Target className="h-6 w-6 shrink-0 mt-1" style={{ color: "var(--positive)" }} />
                  <div>
                    <h2 className="font-display text-[18px] font-bold" style={{ color: "var(--positive)" }}>
                      Hedging saves money when {report.company.fuel_type} exceeds ${report.detailed_scenarios.breakeven.fuel_price_per_gallon}/gal
                    </h2>
                    <p className="text-[13px] mt-2 text-[color:var(--ink-2)] leading-relaxed">
                      {report.detailed_scenarios.breakeven.description}
                    </p>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: "Current Price", value: `$${report.current_price.toFixed(3)}` },
                        { label: "Breakeven Price", value: `$${report.detailed_scenarios.breakeven.fuel_price_per_gallon}` },
                        { label: "Increase Needed", value: `+${(report.detailed_scenarios.breakeven.price_change_pct * 100).toFixed(1)}%` },
                        { label: "Annual Hedge Cost", value: `$${report.hedge_position.annual_expense_cost.toLocaleString()}` },
                      ].map((m) => (
                        <div key={m.label} className="rounded-lg p-3 border border-[color:var(--positive)]" style={{ background: "var(--bg-elev)" }}>
                          <p className="text-[10px] uppercase font-semibold" style={{ color: "var(--positive)" }}>{m.label}</p>
                          <p className="text-num text-[16px] font-bold mt-0.5" style={{ color: "var(--ink)" }}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="surface p-5">
                <h3 className="h-section mb-3">Breakeven by Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {report.strategies.map((s) => {
                    const expCost = s.position.annual_expense_cost;
                    const notional = s.position.dollar_notional;
                    const corr = s.position.correlation_to_retail;
                    const beChange = notional > 0 && corr > 0 ? expCost / (notional * corr) : 0;
                    const bePrice = report.current_price * (1 + beChange);
                    return (
                      <div key={s.tier} className="surface-flat p-4">
                        <p className="text-[10px] text-[color:var(--muted)] uppercase font-semibold tracking-wider">{s.tier}</p>
                        <p className="text-num text-[20px] font-bold text-[color:var(--ink)] mt-1">${bePrice.toFixed(3)}/gal</p>
                        <p className="text-[11px] text-[color:var(--muted)] mt-1">
                          +{(beChange * 100).toFixed(1)}% · {(s.hedge_ratio * 100)}% coverage · ${expCost.toLocaleString()}/yr
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSection === "all-strategies" && (
            <div className="space-y-4">
              <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
                <h3 className="h-section px-5 pt-5 pb-3">
                  ETF + ETF Options Approaches (Series 65/66 advisory)
                </h3>
                {allStrategies ? (
                  <div className="overflow-x-auto">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Approach</th>
                          <th className="right">Annual Cost</th>
                          <th className="right">Capital Required</th>
                          <th>Max Loss</th>
                          <th>Correlation</th>
                          <th>Complexity</th>
                          <th>Best For</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          (allStrategies as {
                            comparison?: {
                              approach: string;
                              annual_cost: number;
                              upfront_capital: number;
                              max_loss: string;
                              correlation: string;
                              complexity: string;
                              best_for: string;
                            }[];
                          }).comparison || []
                        ).map((c) => (
                          <tr key={c.approach}>
                            <td className="font-semibold">{c.approach}</td>
                            <td className="right num">${c.annual_cost.toLocaleString()}</td>
                            <td className="right num">${c.upfront_capital.toLocaleString()}</td>
                            <td className="text-[11px]">{c.max_loss}</td>
                            <td className="text-[12px]">{c.correlation}</td>
                            <td>
                              <span
                                className={`pill ${
                                  c.complexity === "Low"
                                    ? "pill-positive"
                                    : c.complexity === "Medium"
                                    ? "pill-warning"
                                    : "pill-negative"
                                }`}
                              >
                                {c.complexity}
                              </span>
                            </td>
                            <td className="text-[11px] text-[color:var(--muted)]">{c.best_for}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-[color:var(--muted)] px-5 pb-5">Loading strategy comparison...</p>
                )}
              </div>
              <div className="surface p-5" style={{ background: "var(--bg)" }}>
                <p className="text-[12px] text-[color:var(--muted)] leading-relaxed">
                  <strong className="text-[color:var(--ink-2)]">Scope note.</strong> Series 3
                  strategies (commodity futures, options on RBOB/ULSD futures) are not offered on this
                  platform. All recommendations are Series 65/66 advisory; the client executes through
                  their own brokerage or via a managed account where the adviser holds appropriate
                  authorization. No commissions are collected on options trades.
                </p>
              </div>
            </div>
          )}

          {activeSection === "sensitivity" && (
            <div className="space-y-4">
              <ScenarioChart scenarios={report.detailed_scenarios.scenarios} />
              <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
                <h3 className="h-section px-5 pt-5 pb-3">Detailed Price Sensitivity</h3>
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Change</th>
                        <th className="right">$/Gal</th>
                        <th className="right">Unhedged</th>
                        <th className="right">Hedged</th>
                        <th className="right">Savings</th>
                        <th className="right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.detailed_scenarios.scenarios.map((s) => (
                        <tr
                          key={s.price_change_pct}
                          style={Math.abs(s.price_change_pct) < 0.001 ? { background: "var(--bg)", fontWeight: 600 } : undefined}
                        >
                          <td className="font-semibold">{s.price_change_pct >= 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%</td>
                          <td className="right num">${s.new_price_per_gallon.toFixed(3)}</td>
                          <td className="right num">${s.unhedged_annual_cost.toLocaleString()}</td>
                          <td className="right num">${s.hedged_annual_cost.toLocaleString()}</td>
                          <td className="right num font-semibold" style={{ color: s.savings >= 0 ? "var(--positive)" : "var(--negative)" }}>
                            {s.savings >= 0 ? "+" : ""}${s.savings.toLocaleString()}
                          </td>
                          <td className="right num" style={{ color: s.savings_pct >= 0 ? "var(--positive)" : "var(--negative)" }}>
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

          {activeSection === "monthly" && (
            <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
              <h3 className="h-section px-5 pt-5 pb-3">Monthly Cost Projections</h3>
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="right">Unhedged</th>
                      <th className="right">Hedged</th>
                      <th className="right">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.detailed_scenarios.monthly_projections.map((m) => (
                      <tr key={m.month}>
                        <td className="font-medium">{m.month}</td>
                        <td className="right num">${m.unhedged_cost.toLocaleString()}</td>
                        <td className="right num">${m.hedged_cost.toLocaleString()}</td>
                        <td className="right num font-semibold" style={{ color: m.savings >= 0 ? "var(--positive)" : "var(--negative)" }}>
                          {m.savings >= 0 ? "+" : ""}${m.savings.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: "var(--bg)", fontWeight: 700 }}>
                      <td>Annual Total</td>
                      <td className="right num">${report.detailed_scenarios.annual_summary.current_annual_cost.toLocaleString()}</td>
                      <td className="right num">
                        ${(report.detailed_scenarios.annual_summary.current_annual_cost + report.detailed_scenarios.annual_summary.hedge_annual_expense).toLocaleString()}
                      </td>
                      <td className="right num" style={{ color: "var(--negative)" }}>
                        -${report.detailed_scenarios.annual_summary.hedge_annual_expense.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === "implementation" && (
            <div className="space-y-3">
              <div className="surface-deep p-6 mb-4" style={{ borderRadius: "var(--radius-lg)" }}>
                <h2 className="font-display text-[18px] font-bold text-white mb-1">Step-by-Step Implementation</h2>
                <p className="text-[13px] text-white/65">
                  How to implement a {(hedgeRatio * 100).toFixed(0)}% fuel hedge using {ticker}.
                </p>
              </div>
              {[
                { n: 1, title: "Open a Brokerage Account", body: "Open a standard taxable account at Schwab, Fidelity, or Interactive Brokers. $0 commissions on ETF trades. 1–3 business days." },
                { n: 2, title: `Fund with $${report.hedge_position.dollar_notional.toLocaleString()}`, body: `Transfer funds to cover ${report.hedge_position.shares_needed.toLocaleString()} shares of ${ticker} at ~$${report.hedge_position.etf_price.toFixed(2)}/share. ACH (2–3 days) or wire (same day).` },
                { n: 3, title: `Buy ${report.hedge_position.shares_needed.toLocaleString()} shares of ${ticker}`, body: `Place a limit order during market hours (9:30 AM – 4:00 PM ET). ${report.hedge_position.product_name} has ${(report.hedge_position.correlation_to_retail * 100).toFixed(0)}% correlation to retail ${report.company.fuel_type}.` },
                { n: 4, title: "Set Up Monitoring", body: `Track weekly: ETF position value vs fuel costs, ${report.company.fuel_type} price trends from EIA.gov, correlation drift. Set ±10% price alerts.` },
                { n: 5, title: "Rebalance Quarterly", body: `Formula: (Monthly Gallons × Current Price × 12 × ${(hedgeRatio * 100)}%) ÷ ETF Price = Target Shares. Rebalance if >10% drift.` },
                { n: 6, title: "Costs", body: `ETF expense: $${report.hedge_position.annual_expense_cost.toLocaleString()}/yr (${((report.hedge_position.annual_expense_cost / report.hedge_position.dollar_notional) * 100).toFixed(2)}%). Trading: $0. Advisory: per agreement.` },
                { n: 7, title: "Exit Strategy", body: `Sell shares via limit order. Settlement T+1. ${ticker} issues K-1 — gains taxed 60% long-term / 40% short-term. Consult your accountant.` },
              ].map((step) => (
                <div key={step.n} className="surface p-5 flex gap-4">
                  <span
                    className="flex items-center justify-center w-9 h-9 rounded-full text-[14px] font-bold shrink-0"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-[14px] font-semibold text-[color:var(--ink)]">{step.title}</h3>
                    <p className="text-[13px] text-[color:var(--ink-2)] mt-1 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "ai" && (
            <div className="space-y-4">
              <div className="surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="h-section flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> AI Strategy Analysis
                  </h3>
                  <button onClick={loadAI} disabled={aiLoading} className="btn btn-primary btn-sm">
                    {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {aiLoading ? "Analyzing..." : aiNarrative ? "Regenerate" : "Generate Analysis"}
                  </button>
                </div>
                {aiNarrative ? (
                  <div className="text-[13px] text-[color:var(--ink-2)] whitespace-pre-wrap leading-relaxed">{aiNarrative.response}</div>
                ) : (
                  <p className="text-sm text-[color:var(--muted-2)]">Click to generate a personalized AI recommendation.</p>
                )}
              </div>
              <ComplianceDisclaimer disclaimers={aiNarrative?.disclaimers} />
            </div>
          )}

          {activeSection === "deep" && (
            <div className="space-y-4">
              <div className="surface p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="h-section flex items-center gap-1.5">
                      <Zap className="h-3 w-3" /> AI Deep-Dive Report
                    </h3>
                    <p className="text-[11px] text-[color:var(--muted-2)] mt-1">
                      Comprehensive 10-section analysis covering ETFs, options, futures, and licensing.
                    </p>
                  </div>
                  <button onClick={loadDeepReport} disabled={deepLoading} className="btn btn-accent btn-sm">
                    {deepLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    {deepLoading ? "Generating (30–60s)..." : deepReport ? "Regenerate" : "Generate Deep Report"}
                  </button>
                </div>
                {deepReport ? (
                  <div className="text-[13px] text-[color:var(--ink-2)] whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                    {deepReport.response}
                  </div>
                ) : (
                  <div className="rounded-xl p-6 text-center" style={{ background: "var(--accent-tint)" }}>
                    <Zap className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--accent)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--accent-lo)" }}>AI-Powered Deep Analysis</p>
                    <p className="text-[12px] mt-1 text-[color:var(--muted)] max-w-md mx-auto">
                      Generates a comprehensive advisory report covering all hedging approaches, licensing requirements, cost-benefit analysis, and implementation roadmap.
                    </p>
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
