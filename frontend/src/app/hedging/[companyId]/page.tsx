"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { hedgingApi, aiApi, companiesApi, etfOptionsApi, positionsApi, dealsApi } from "@/lib/api";
import type {
  Company,
  StrategyRecommendation,
  ScenarioResult,
  AIResponse,
} from "@/lib/types";
import type { EtfOptionStrategyApi } from "@/lib/api";
import StrategyCard from "@/components/StrategyCard";
import ScenarioChart from "@/components/ScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import ErrorAlert from "@/components/ErrorAlert";
import OptionsChainPicker, { type PickedContract } from "@/components/OptionsChainPicker";
import {
  FileText,
  MessageSquare,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

type Tab = "etf" | "etf_options";

export default function HedgingPage() {
  const params = useParams();
  const companyId = Number(params.companyId);
  const [company, setCompany] = useState<Company | null>(null);
  const [recommendations, setRecommendations] = useState<StrategyRecommendation[]>([]);
  const [etfOptions, setEtfOptions] = useState<EtfOptionStrategyApi[] | null>(null);
  const [etfPrices, setEtfPrices] = useState<Record<string, number>>({});
  const [liveQuotesOk, setLiveQuotesOk] = useState(false);
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
  const [tab, setTab] = useState<Tab>("etf");
  const [hedgeRatio, setHedgeRatio] = useState(0.5);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      companiesApi.get(companyId),
      hedgingApi.recommend(companyId),
    ])
      .then(([c, rec]) => {
        setCompany(c);
        setRecommendations(rec.recommendations);
        setFuelPrice(rec.current_fuel_price);
        setMonthlyGallons(rec.monthly_gallons);
        loadScenarios(0.5, rec.recommendations[1]?.position?.product_ticker || "UGA");
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    etfOptionsApi
      .forCompany(companyId, hedgeRatio)
      .then((r) => {
        setEtfOptions(r.strategies);
        setEtfPrices(r.etf_prices);
        setLiveQuotesOk(r.live_quotes_available);
      })
      .catch(() => setEtfOptions([]));
  }, [companyId, hedgeRatio]);

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
      setAiRec({
        response: `AI recommendation error: ${err instanceof Error ? err.message : String(err)}`,
        disclaimers: [],
      });
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
      <div className="space-y-4 animate-pulse">
        <div className="h-9 bg-[color:var(--bg-elev)] rounded w-64" />
        <div className="h-4 bg-[color:var(--bg-elev)] rounded w-96" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-48 bg-[color:var(--bg-elev)] rounded-lg" />
          <div className="h-48 bg-[color:var(--bg-elev)] rounded-lg" />
          <div className="h-48 bg-[color:var(--bg-elev)] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert
        title="Failed to Load Hedging Data"
        message={error}
        suggestion="Check that the company exists and the API is running."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const annualCost = monthlyGallons * 12 * fuelPrice;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <span className="h-section">Strategy Workbench</span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">{company?.name}</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1.5">
            Three approaches: ETF allocation, ETF options, and futures-based hedging. Compare side-by-side, recommend
            the right fit, then track positions live.
          </p>
        </div>
        <Link href={`/reports/${companyId}`} className="btn btn-primary shrink-0">
          <FileText className="h-4 w-4" /> Client Report
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Metric label="Monthly Gallons" value={monthlyGallons.toLocaleString()} sub={`${company?.fuel_type}`} accent="accent" />
        <Metric label="Current Price" value={`$${fuelPrice.toFixed(3)}`} sub="per gallon (EIA)" accent="ink" />
        <Metric label="Annual Fuel Cost" value={`$${annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="unhedged" accent="teal" />
        <Metric label="Hedge Ratio" value={`${(hedgeRatio * 100).toFixed(0)}%`} sub="adjustable" accent="positive">
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={hedgeRatio}
            onChange={(e) => setHedgeRatio(parseFloat(e.target.value))}
            className="w-full mt-2 accent-[color:var(--accent)]"
          />
        </Metric>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 border-b border-[color:var(--line)]">
        <TabButton active={tab === "etf"} onClick={() => setTab("etf")} icon={<Target className="h-3.5 w-3.5" />}>
          ETF Allocation
        </TabButton>
        <TabButton active={tab === "etf_options"} onClick={() => setTab("etf_options")} icon={<Sparkles className="h-3.5 w-3.5" />}>
          ETF Options
          <span className="pill pill-accent text-[9px] py-0">NEW</span>
        </TabButton>
        <span className="ml-auto pb-2 text-[11px] text-[color:var(--muted-2)] flex items-center gap-2">
          {liveQuotesOk ? (
            <>
              <span className="pill pill-live text-[9px] py-0">Live ETF prices</span>
            </>
          ) : (
            <span className="pill pill-outline text-[9px] py-0">Default ETF prices</span>
          )}
          {Object.entries(etfPrices).slice(0, 4).map(([k, v]) => (
            <span key={k} className="text-num">{k} ${v.toFixed(2)}</span>
          ))}
        </span>
      </div>

      {tab === "etf" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {recommendations.map((r) => (
              <StrategyCard
                key={r.tier}
                strategy={r}
                selected={selectedTier === r.tier}
                onSelect={() => handleTierSelect(r.tier)}
              />
            ))}
          </div>

          {scenarios.length > 0 && (
            <div className="mb-6">
              <ScenarioChart scenarios={scenarios} />
              <div className="surface p-5 mt-4">
                <h3 className="h-section mb-3">Cost At Various Price Levels</h3>
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Price Change</th>
                        <th className="right">New Price</th>
                        <th className="right">Unhedged</th>
                        <th className="right">Hedged</th>
                        <th className="right">Savings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((s) => (
                        <tr key={s.price_change_pct}>
                          <td>
                            <span className="text-num font-semibold">
                              {s.price_change_pct >= 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="right num">${s.new_price_per_gallon.toFixed(3)}</td>
                          <td className="right num">${s.unhedged_annual_cost.toLocaleString()}</td>
                          <td className="right num">${s.hedged_annual_cost.toLocaleString()}</td>
                          <td
                            className="right num font-semibold"
                            style={{ color: s.savings >= 0 ? "var(--positive)" : "var(--negative)" }}
                          >
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
        </>
      )}

      {tab === "etf_options" && (
        <EtfOptionsPanel
          strategies={etfOptions}
          companyId={companyId}
          companyName={company?.name ?? ""}
        />
      )}

      {/* AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="h-section">AI Recommendation</h3>
            <button
              onClick={getAIRecommendation}
              disabled={aiLoading}
              className="btn btn-primary btn-sm"
            >
              {aiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {aiLoading ? "Analyzing..." : "Get AI Analysis"}
            </button>
          </div>
          {aiRec ? (
            <div className="text-[13px] text-[color:var(--ink-2)] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {aiRec.response}
            </div>
          ) : (
            <p className="text-xs text-[color:var(--muted-2)]">
              Click <strong>Get AI Analysis</strong> for a personalized hedging recommendation powered by Claude.
            </p>
          )}
        </div>

        <div className="surface p-5">
          <h3 className="h-section mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Ask About This Client
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="e.g., What happens if diesel drops to $3.00?"
              className="input flex-1"
            />
            <button onClick={askQuestion} disabled={chatLoading} className="btn btn-primary">
              {chatLoading ? "..." : "Ask"}
            </button>
          </div>
          {chatResponse && (
            <div className="text-[13px] text-[color:var(--ink-2)] whitespace-pre-wrap bg-[color:var(--bg)] rounded-md p-3 max-h-64 overflow-y-auto leading-relaxed border border-[color:var(--line)]">
              {chatResponse}
            </div>
          )}
        </div>
      </div>

      <ComplianceDisclaimer disclaimers={aiRec?.disclaimers} />
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: "accent" | "teal" | "positive" | "ink";
  children?: React.ReactNode;
}) {
  return (
    <div className={`kpi kpi-${accent}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold transition-colors -mb-px"
      style={{
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        color: active ? "var(--ink)" : "var(--muted)",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function EtfOptionsPanel({
  strategies,
  companyId,
  companyName,
}: {
  strategies: EtfOptionStrategyApi[] | null;
  companyId: number;
  companyName: string;
}) {
  const [openTrack, setOpenTrack] = useState<EtfOptionStrategyApi | null>(null);

  if (strategies === null) {
    return (
      <div className="surface p-10 text-center text-[color:var(--muted)]">
        <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
        Loading ETF options strategies...
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="surface p-6 text-center text-[color:var(--muted)]">
        No ETF options strategies available for this client (likely missing fuel consumption data).
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {strategies.map((s, i) => (
          <StrategyOptionCard
            key={s.strategy_key}
            strategy={s}
            best={i === 0}
            companyId={companyId}
            onTrack={() => setOpenTrack(s)}
          />
        ))}
      </div>
      <div className="surface p-5 mb-6 bg-[color:var(--bg)]">
        <h3 className="h-section mb-3 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" /> What Each Strategy Looks Like At Expiry
        </h3>
        <ul className="space-y-2 text-[13px] text-[color:var(--ink-2)] leading-relaxed">
          <li>
            <strong className="text-[color:var(--accent-lo)]">Long Call</strong> — pure upside protection. Fuel spikes
            ⇒ ETF rises ⇒ call value tracks the rise. Worst case: lose premium. Best case: unlimited offset.
          </li>
          <li>
            <strong className="text-[color:var(--teal)]">Collar</strong> — own the ETF + put floor + short call ceiling.
            Brackets exposure. Near-zero net cost. Most popular for risk-averse small businesses.
          </li>
          <li>
            <strong className="text-[color:var(--ink-2)]">Covered Call</strong> — own ETF + sell calls for monthly
            income. Caps upside above strike. Best in range-bound markets.
          </li>
          <li>
            <strong className="text-[color:var(--ink-2)]">Cash-Secured Short Put</strong> — sell put, get paid to wait
            for a pullback. If assigned, you start the hedge at a lower basis.
          </li>
        </ul>
      </div>
      {openTrack && (
        <TrackOptionPositionModal
          strategy={openTrack}
          companyId={companyId}
          companyName={companyName}
          onClose={() => setOpenTrack(null)}
        />
      )}
    </>
  );
}

function StrategyOptionCard({
  strategy,
  best,
  companyId,
  onTrack,
}: {
  strategy: EtfOptionStrategyApi;
  best?: boolean;
  companyId: number;
  onTrack: () => void;
}) {
  return (
    <div className="strategy-card" data-tier={best ? "best" : undefined}>
      {best && (
        <span
          className="absolute -top-2 left-5 pill"
          style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}
        >
          <Sparkles className="h-3 w-3" /> Recommended
        </span>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-[color:var(--muted)] font-semibold">
            {strategy.ticker} · {strategy.expiry_days}d
          </p>
          <h3 className="font-display text-[17px] font-bold tracking-tight mt-0.5 text-[color:var(--ink)]">
            {strategy.display_name}
          </h3>
        </div>
        <div
          className="text-right shrink-0"
          style={{
            color: strategy.total_premium >= 0 ? "var(--negative)" : "var(--positive)",
          }}
        >
          <p className="text-num text-[18px] font-bold">{strategy.total_premium_label}</p>
          <p className="text-[10px] text-[color:var(--muted)]">{strategy.contracts} contracts</p>
        </div>
      </div>
      <p className="text-[13px] text-[color:var(--ink-2)] leading-relaxed mb-4">{strategy.description}</p>
      <div className="grid grid-cols-2 gap-3 mb-4 text-[12px]">
        <KeyVal label="Max Loss" value={typeof strategy.max_loss === "number" ? `$${Math.round(strategy.max_loss).toLocaleString()}` : strategy.max_loss} />
        <KeyVal label="Max Gain" value={typeof strategy.max_gain === "number" ? `$${Math.round(strategy.max_gain).toLocaleString()}` : strategy.max_gain} />
        {strategy.breakeven_etf_price !== null && (
          <KeyVal label="Breakeven" value={`$${strategy.breakeven_etf_price.toFixed(2)}`} />
        )}
        <KeyVal label="Net Δ" value={strategy.net_delta.toFixed(0)} />
        {strategy.shares_required && (
          <KeyVal label="Shares Held" value={strategy.shares_required.toLocaleString()} />
        )}
        {strategy.cash_required && (
          <KeyVal label="Cash Collateral" value={`$${strategy.cash_required.toLocaleString()}`} />
        )}
      </div>
      <div className="hr mb-3" />
      <div className="space-y-1.5 mb-4">
        {strategy.legs.map((leg, i) => (
          <div key={i} className="flex items-center justify-between text-[12px]">
            <span>
              <span className={`pill ${leg.side === "long" ? "pill-positive" : "pill-warning"}`}>
                {leg.side === "long" ? "BUY" : "SELL"}
              </span>{" "}
              <span className="text-num">${leg.strike.toFixed(2)}</span> {leg.option_type} · ×{leg.contracts}
            </span>
            <span className="text-num text-[color:var(--muted)]">
              Δ {leg.delta.toFixed(2)} · θ {leg.theta_per_day.toFixed(3)}/day
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[color:var(--muted)] mb-4 italic leading-relaxed">
        <strong className="not-italic text-[color:var(--ink-2)]">Best for:</strong> {strategy.best_for}
      </p>
      <div className="flex gap-2">
        <button onClick={onTrack} className="btn btn-accent btn-sm flex-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Track This Position
        </button>
        <Link
          href={`/modeler/${companyId}?strategy=${strategy.strategy_key}`}
          className="btn btn-ghost btn-sm shrink-0"
          title="Model this strategy across fuel-price scenarios"
        >
          Scenario Model
        </Link>
      </div>
    </div>
  );
}

function KeyVal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[color:var(--bg)] border border-[color:var(--line)] rounded-md px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--muted)] font-semibold">{label}</p>
      <p className="text-num text-[13px] font-semibold mt-0.5 text-[color:var(--ink)]">{value}</p>
    </div>
  );
}

function TrackOptionPositionModal({
  strategy,
  companyId,
  companyName,
  onClose,
}: {
  strategy: EtfOptionStrategyApi;
  companyId: number;
  companyName: string;
  onClose: () => void;
}) {
  const [deals, setDeals] = useState<{ id: number; status: string }[]>([]);
  const [dealId, setDealId] = useState<number | null>(null);
  const [legIdx, setLegIdx] = useState(0);
  const [contracts, setContracts] = useState(strategy.contracts);
  const [picked, setPicked] = useState<PickedContract | null>(null);
  const [useLiveChain, setUseLiveChain] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    dealsApi.list({ companyId }).then((d) => {
      setDeals(d);
      if (d.length > 0) setDealId(d[0].id);
    });
  }, [companyId]);

  const leg = strategy.legs[legIdx];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dealId) {
      setErr("Pick a deal");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const useLive = useLiveChain && picked !== null;
      await positionsApi.create({
        deal_id: dealId,
        strategy_key: strategy.strategy_key,
        ticker: strategy.ticker,
        option_type: leg.option_type,
        side: leg.side,
        strike: useLive ? picked!.strike : leg.strike,
        expiry: useLive
          ? picked!.expiry
          : new Date(Date.now() + strategy.expiry_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        contracts,
        entry_premium_per_share: useLive ? picked!.premium : leg.premium_per_share,
        entry_underlying_price: useLive ? picked!.underlyingPrice : strategy.underlying_price,
        iv_used: useLive ? picked!.impliedVolatility ?? leg.iv_used : leg.iv_used,
        notes: `${strategy.display_name} · ${companyName}${useLive ? " · live chain fill" : ""}`,
      });
      onClose();
      window.location.href = "/tracker";
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(11, 18, 32, 0.55)" }}
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold mb-1">Track {strategy.display_name}</h2>
        <p className="text-xs text-[color:var(--muted)] mb-5">
          Capture an executed trade for {companyName}. Multi-leg strategies (collar) require one position per leg.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">Deal</label>
            <select
              className="select"
              value={dealId ?? ""}
              onChange={(e) => setDealId(Number(e.target.value))}
            >
              {deals.length === 0 && <option value="">No deals for this client yet</option>}
              {deals.map((d) => (
                <option key={d.id} value={d.id}>Deal #{d.id} · {d.status}</option>
              ))}
            </select>
          </div>
          {strategy.legs.length > 1 && (
            <div>
              <label className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">Leg</label>
              <select
                className="select"
                value={legIdx}
                onChange={(e) => setLegIdx(Number(e.target.value))}
              >
                {strategy.legs.map((l, i) => (
                  <option key={i} value={i}>
                    {l.side === "long" ? "Buy" : "Sell"} ${l.strike.toFixed(2)} {l.option_type} @ ${l.premium_per_share.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useLiveChain}
                onChange={(e) => setUseLiveChain(e.target.checked)}
                className="accent-[color:var(--accent)]"
              />
              <span className="font-semibold text-[color:var(--ink-2)]">
                Use live Yahoo chain (recommended)
              </span>
            </label>
            <span className="text-[color:var(--muted-2)]">
              · falls back to modeled premium if off
            </span>
          </div>
          {useLiveChain ? (
            <OptionsChainPicker
              ticker={strategy.ticker}
              optionType={leg.option_type}
              preferredDays={strategy.expiry_days}
              preferredStrike={leg.strike}
              onPick={setPicked}
            />
          ) : (
            <div className="surface p-3" style={{ background: "var(--bg)" }}>
              <p className="text-[11px] text-[color:var(--muted)]">
                Using modeled values: strike ${leg.strike.toFixed(2)} · premium ${leg.premium_per_share.toFixed(2)}/share ·
                expires in {strategy.expiry_days}d
              </p>
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">Contracts</label>
            <input
              type="number"
              className="input"
              value={contracts}
              min={1}
              onChange={(e) => setContracts(Number(e.target.value))}
            />
            <p className="text-[10px] text-[color:var(--muted-2)] mt-1">
              Recommended: {strategy.contracts} contracts
            </p>
          </div>
          {err && <div className="pill pill-negative">{err}</div>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-accent">
              {submitting ? "Saving..." : (
                <>
                  Track Position
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
