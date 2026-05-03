"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Shield,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Check,
  Printer,
  Building2,
  Calendar,
  Briefcase,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { Deal } from "@/lib/types";
import { dealsApi, hedgingPlansApi } from "@/lib/api";
import { FEE_STRUCTURES } from "@/lib/constants";

type HedgingApproach = "etf" | "options" | "futures" | "";
type StrategyTier = "conservative" | "moderate" | "aggressive" | "";
type Brokerage =
  | "charles_schwab"
  | "fidelity"
  | "interactive_brokers"
  | "td_ameritrade"
  | "other"
  | "";
type StartTiming = "immediately" | "next_month" | "next_quarter" | "custom" | "";
type RebalanceFrequency = "monthly" | "quarterly" | "semi_annually" | "";

const STEPS = [
  "Hedging Approach",
  "Strategy Tier",
  "Brokerage",
  "Timeline",
  "Review & Generate",
];

const APPROACH_DETAILS: Record<
  Exclude<HedgingApproach, "">,
  {
    title: string;
    plain: string;
    pros: string[];
    cons: string[];
    cost: string;
    license: string;
    bestFor: string;
    risk: "Low" | "Medium" | "High";
  }
> = {
  etf: {
    title: "ETF-Based Hedging",
    plain:
      "You buy shares of a fund that goes up when fuel prices go up. Hold the shares while fuel costs are high; sell when prices ease. It's the simplest way to offset rising fuel bills — works through any normal stockbroker account.",
    pros: [
      "Open with your existing Series 65/66 license — no new exam needed.",
      "Sell shares any time during market hours; cash settles next day.",
      "No margin calls, no expiry, no daily settlement headaches.",
      "Lowest barrier to entry — clients can fund a $10k position and start tomorrow.",
    ],
    cons: [
      "Tracking error: an ETF won't move 1-for-1 with retail pump prices (correlation typically 0.78–0.88).",
      "Annual expense ratio (~1%) eats a small slice of the position each year.",
      "Issues a K-1 tax form (limited-partnership structure) — extra paperwork at tax time.",
      "Contango losses: when futures markets are in contango, the fund loses value over time even if oil holds flat.",
    ],
    cost: "Capital required ≈ annual fuel cost × hedge % ÷ correlation. Plus ~1%/yr expense ratio.",
    license: "Series 65/66 (advisory) — what you already hold.",
    bestFor:
      "First-time hedgers, smaller fleets, advisors who want a clean one-account solution clients can understand.",
    risk: "Low",
  },
  options: {
    title: "Options Contracts",
    plain:
      "You pay a one-time premium up front, just like buying insurance. If fuel prices spike, the option pays out big. If prices stay flat or drop, the most you can lose is the premium you paid. Great for capping downside.",
    pros: [
      "Maximum loss is capped at the premium — no surprise margin calls.",
      "90–95% correlation with retail fuel because it tracks RBOB / ULSD futures directly.",
      "Cheaper than buying full futures coverage — premium is a fraction of notional.",
      "Pays off explosively during fuel spikes (the kind that hurt small businesses most).",
    ],
    cons: [
      "Requires the Series 3 license (~80 hours of study, $140 exam).",
      "Premium is a real cost — if prices stay flat, you lose the premium with nothing to show.",
      "Options expire (typically 6 months). You have to roll the position to stay hedged.",
      "Pricing is more opaque than ETFs — strikes, IVs, and Greeks matter.",
    ],
    cost: "Premium ≈ 6.5% of hedged notional. No ongoing expense ratio.",
    license: "Series 3 (commodity futures) required.",
    bestFor:
      "Cost-conscious clients who want catastrophic-spike protection without tying up large amounts of capital.",
    risk: "Medium",
  },
  futures: {
    title: "Futures Contracts",
    plain:
      "A binding agreement to buy fuel later at today's price. The strongest possible hedge — moves dollar-for-dollar with the wholesale fuel market — but you have to maintain margin, and you can lose money if prices fall.",
    pros: [
      "Highest correlation to retail fuel (92–95%) — closest thing to a perfect hedge.",
      "No expense ratio. You only pay margin and tiny per-contract commissions.",
      "Highly liquid — RBOB and ULSD futures trade massive volume on NYMEX.",
      "Predictable settlement, daily mark-to-market — full transparency.",
    ],
    cons: [
      "Requires the Series 3 license.",
      "Margin calls: if fuel prices fall, your account may be required to deposit more cash same-day.",
      "Unlimited theoretical downside on the long side — you can lose more than your initial margin.",
      "Daily settlement + position management = active management every business day.",
    ],
    cost: "Margin ≈ 10% of notional. Minimal commissions. No ongoing fee.",
    license: "Series 3 (commodity futures) required.",
    bestFor:
      "Larger fleets (>20k gallons/month) where the correlation upgrade is worth the daily management overhead.",
    risk: "High",
  },
};

const TIER_DETAILS: Record<
  Exclude<StrategyTier, "">,
  {
    label: string;
    pct: string;
    plain: string;
    pros: string[];
    cons: string[];
    bestFor: string;
  }
> = {
  conservative: {
    label: "Conservative",
    pct: "25%",
    plain:
      "You hedge a quarter of your fuel. If prices spike, three-quarters of your fuel bill still goes up — but the quarter you covered helps cushion the blow. Cheapest to set up, smallest impact either way.",
    pros: [
      "Lowest up-front capital.",
      "Lowest exposure to ETF tracking error or premium loss.",
      "Easy to explain to a nervous first-time client.",
    ],
    cons: [
      "Only partial protection — a big spike still hurts most of the budget.",
      "If you're going to do this, full coverage is usually not much more expensive.",
    ],
    bestFor:
      "Cost-sensitive small clients dipping a toe in, or seasonal businesses with variable usage.",
  },
  moderate: {
    label: "Moderate",
    pct: "50%",
    plain:
      "You hedge half. Half your fuel costs are locked in — predictable for budgeting and bidding. The other half stays flexible if prices fall. The most popular choice for small businesses.",
    pros: [
      "Half your fuel cost becomes predictable — game-changer for bidding contracts.",
      "Best balance of protection vs. capital tied up.",
      "If fuel falls, you still benefit on the unhedged half.",
    ],
    cons: [
      "Higher up-front capital than conservative.",
      "Expense ratio costs more in absolute dollars.",
    ],
    bestFor:
      "Most clients. Trucking companies bidding on contracts, fleets where fuel is 15–35% of revenue.",
  },
  aggressive: {
    label: "Aggressive",
    pct: "75%",
    plain:
      "You hedge three-quarters. Almost all your fuel costs are locked in. Maximum protection from spikes — but if fuel falls a lot, you don't get most of the savings.",
    pros: [
      "Maximum protection — fuel becomes a near-fixed cost.",
      "Best for businesses where fuel is the dominant cost driver.",
      "Easiest to forecast P&L for a year out.",
    ],
    cons: [
      "Highest up-front capital and ongoing expense.",
      "If fuel falls 20%, you only see 5% on the unhedged portion.",
      "More to unwind if business situation changes.",
    ],
    bestFor:
      "Long-haul trucking, last-mile delivery scaling fleets, businesses where fuel >35% of revenue.",
  },
};

const TICKER_BY_APPROACH_AND_FUEL: Record<string, string> = {
  "etf-gasoline": "UGA",
  "etf-diesel": "USO",
  "options-gasoline": "RBOB",
  "options-diesel": "ULSD",
  "futures-gasoline": "RBOB",
  "futures-diesel": "ULSD",
};

export default function ImplementationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 py-10 px-4">
          <div className="max-w-4xl mx-auto animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-32 mb-4" />
            <div className="h-8 bg-slate-200 rounded w-64" />
          </div>
        </div>
      }
    >
      <ImplementationPageInner />
    </Suspense>
  );
}

function ImplementationPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.companyId as string;
  const dealIdParam = searchParams.get("deal_id");

  const [companyName, setCompanyName] = useState("");
  const [fuelType, setFuelType] = useState<string>("gasoline");
  const [annualFuelCost, setAnnualFuelCost] = useState<number>(0);
  const [companyDeals, setCompanyDeals] = useState<Deal[]>([]);
  const [linkedDeal, setLinkedDeal] = useState<Deal | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [planSaved, setPlanSaved] = useState<{ id: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const [approach, setApproach] = useState<HedgingApproach>("");
  const [expandedApproach, setExpandedApproach] = useState<HedgingApproach>("");
  const [tier, setTier] = useState<StrategyTier>("");
  const [expandedTier, setExpandedTier] = useState<StrategyTier>("");
  const [brokerage, setBrokerage] = useState<Brokerage>("");
  const [otherBrokerage, setOtherBrokerage] = useState("");
  const [startTiming, setStartTiming] = useState<StartTiming>("");
  const [customDate, setCustomDate] = useState("");
  const [rebalanceFrequency, setRebalanceFrequency] = useState<RebalanceFrequency>("");

  useEffect(() => {
    fetch(`/api/companies/${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        setCompanyName(data.name ?? "");
        const ft = data.fuel_type === "diesel" ? "diesel" : "gasoline";
        setFuelType(ft);
        const monthly =
          ft === "diesel"
            ? data.monthly_gallons_diesel || 0
            : data.monthly_gallons_gasoline || 0;
        setAnnualFuelCost(monthly * 12 * 3.5);
      })
      .catch(() => setCompanyName("Unknown Company"));

    dealsApi
      .list({ companyId: Number(companyId) })
      .then((deals) => {
        setCompanyDeals(deals);
        if (dealIdParam) {
          const found = deals.find((d) => d.id === Number(dealIdParam));
          if (found) {
            setLinkedDeal(found);
            return;
          }
        }
        if (deals.length > 0) {
          const ranked = [...deals].sort((a, b) => {
            const order: Record<string, number> = {
              active: 0,
              signed: 1,
              proposed: 2,
              prospect: 3,
              cancelled: 4,
            };
            return (order[a.status] ?? 5) - (order[b.status] ?? 5);
          });
          setLinkedDeal(ranked[0]);
        }
      })
      .catch(() => setCompanyDeals([]));
  }, [companyId, dealIdParam]);

  const hedgeRatio =
    tier === "conservative" ? 0.25 : tier === "moderate" ? 0.5 : 0.75;

  const productTicker = useMemo(() => {
    if (!approach) return "";
    return TICKER_BY_APPROACH_AND_FUEL[`${approach}-${fuelType}`] || "";
  }, [approach, fuelType]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return approach !== "";
      case 1:
        return tier !== "";
      case 2:
        return (
          brokerage !== "" &&
          (brokerage !== "other" || otherBrokerage.trim() !== "")
        );
      case 3:
        return (
          startTiming !== "" &&
          rebalanceFrequency !== "" &&
          (startTiming !== "custom" || customDate !== "")
        );
      default:
        return true;
    }
  };

  const tierLabel = (t: StrategyTier): string => {
    if (t === "conservative") return "Conservative (25%)";
    if (t === "moderate") return "Moderate (50%)";
    if (t === "aggressive") return "Aggressive (75%)";
    return "";
  };

  const brokerageLabel = (b: Brokerage): string => {
    const map: Record<string, string> = {
      charles_schwab: "Charles Schwab",
      fidelity: "Fidelity",
      interactive_brokers: "Interactive Brokers",
      td_ameritrade: "TD Ameritrade",
      other: otherBrokerage || "Other",
    };
    return map[b] ?? "";
  };

  const timingLabel = (t: StartTiming): string => {
    if (t === "immediately") return "Immediately";
    if (t === "next_month") return "Next Month";
    if (t === "next_quarter") return "Next Quarter";
    if (t === "custom") return customDate;
    return "";
  };

  const frequencyLabel = (f: RebalanceFrequency): string => {
    if (f === "monthly") return "Monthly";
    if (f === "quarterly") return "Quarterly";
    if (f === "semi_annually") return "Semi-Annually";
    return "";
  };

  async function generatePlan() {
    if (!approach || !tier || !brokerage) return;
    setSaving(true);
    try {
      const created = await hedgingPlansApi.create({
        company_id: Number(companyId),
        deal_id: linkedDeal ? linkedDeal.id : null,
        approach,
        tier,
        hedge_ratio: hedgeRatio,
        product_ticker: productTicker,
        brokerage,
        brokerage_other: brokerage === "other" ? otherBrokerage : null,
        start_timing: startTiming,
        custom_date: startTiming === "custom" ? customDate : null,
        rebalance_frequency: rebalanceFrequency,
      });
      setPlanSaved({ id: created.id });

      const fallbackParams = new URLSearchParams({
        plan_id: String(created.id),
        approach,
        tier,
        hedge_ratio: String(hedgeRatio),
        product_ticker: productTicker,
        brokerage,
        start_timing: startTiming,
        rebalance_frequency: rebalanceFrequency,
      });
      if (brokerage === "other" && otherBrokerage) fallbackParams.set("brokerage_other", otherBrokerage);
      if (startTiming === "custom" && customDate) fallbackParams.set("custom_date", customDate);
      if (linkedDeal) fallbackParams.set("deal_id", String(linkedDeal.id));
      window.open(`/api/reports/implementation/${companyId}?${fallbackParams}`, "_blank");
    } catch (e) {
      alert(`Failed to save plan: ${e instanceof Error ? e.message : String(e)}`);
    }
    setSaving(false);
  }

  function projectedAdvisorRevenue(years: number): number {
    if (!linkedDeal) return 0;
    return Math.round(linkedDeal.annual_fee_revenue * years);
  }

  function EducationPanel() {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-6 mb-8">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              First time? Here&apos;s the 60-second primer.
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Fuel hedging means buying a financial product that goes up in value when
              fuel prices go up. So when your client&apos;s fuel bill spikes, the hedge
              gains offset the pain. There are 3 ways to do it. Pick the one that
              matches your license and your client&apos;s budget.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-indigo-200">
                <th className="text-left py-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Approach</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Plain English</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">License</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Up-front Cost</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-100">
              {(["etf", "options", "futures"] as const).map((k) => {
                const d = APPROACH_DETAILS[k];
                return (
                  <tr key={k}>
                    <td className="py-3 px-2 font-semibold text-slate-800 align-top">
                      {d.title}
                    </td>
                    <td className="py-3 px-2 text-slate-600 align-top">{d.plain}</td>
                    <td className="py-3 px-2 text-slate-600 align-top">{d.license}</td>
                    <td className="py-3 px-2 text-slate-600 align-top">{d.cost}</td>
                    <td className="py-3 px-2 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.risk === "Low"
                            ? "bg-emerald-100 text-emerald-700"
                            : d.risk === "Medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {d.risk}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function ProgressBar() {
    return (
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((label, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    isCompleted || isActive
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-300 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    isActive || isCompleted ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${
                    i < currentStep ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function Step1() {
    const approaches: { id: HedgingApproach; icon: React.ReactNode }[] = [
      { id: "etf", icon: <BarChart3 className="w-6 h-6" /> },
      { id: "options", icon: <Shield className="w-6 h-6" /> },
      { id: "futures", icon: <TrendingUp className="w-6 h-6" /> },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Step 1 — Pick the Hedging Approach
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          Click any card to see Pros, Cons, and How It Works in plain English.
        </p>
        <div className="space-y-3">
          {approaches.map((a) => {
            const d = APPROACH_DETAILS[a.id as Exclude<HedgingApproach, "">];
            const isExpanded = expandedApproach === a.id;
            const isSelected = approach === a.id;
            return (
              <div
                key={a.id}
                className={`bg-white rounded-xl border shadow-sm transition-all ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-200"
                    : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => {
                    setApproach(a.id);
                    setExpandedApproach(isExpanded ? "" : a.id);
                  }}
                  className="w-full text-left p-5 flex items-start gap-4"
                >
                  <div className="text-indigo-600 mt-0.5">{a.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-800">{d.title}</h3>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          d.risk === "Low"
                            ? "bg-emerald-100 text-emerald-700"
                            : d.risk === "Medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {d.risk} risk · {d.license}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{d.plain}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedApproach(isExpanded ? "" : a.id);
                      }}
                      className="text-[11px] font-medium text-indigo-600 mt-2 inline-flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>Hide details <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Show pros &amp; cons <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 -mt-1">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">Pros</p>
                      <ul className="space-y-1.5">
                        {d.pros.map((p, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-2">Cons</p>
                      <ul className="space-y-1.5">
                        {d.cons.map((c, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-rose-600 mt-0.5 shrink-0" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Best for</p>
                      <p className="text-xs text-slate-700">{d.bestFor}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function Step2() {
    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Step 2 — Pick the Coverage Level
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          What share of the client&apos;s annual fuel do you want hedged?
        </p>
        <div className="space-y-3">
          {(["conservative", "moderate", "aggressive"] as const).map((id) => {
            const d = TIER_DETAILS[id];
            const isExpanded = expandedTier === id;
            const isSelected = tier === id;
            return (
              <div
                key={id}
                className={`bg-white rounded-xl border shadow-sm transition-all ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-200"
                    : "border-slate-200"
                }`}
              >
                <button
                  onClick={() => {
                    setTier(id);
                    setExpandedTier(isExpanded ? "" : id);
                  }}
                  className="w-full text-left p-5 flex items-start gap-4"
                >
                  <div className="text-3xl font-bold text-indigo-600 w-20 shrink-0">
                    {d.pct}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-1">{d.label}</h3>
                    <p className="text-sm text-slate-600">{d.plain}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTier(isExpanded ? "" : id);
                      }}
                      className="text-[11px] font-medium text-indigo-600 mt-2 inline-flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>Hide details <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Show pros &amp; cons <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 -mt-1">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">Pros</p>
                      <ul className="space-y-1.5">
                        {d.pros.map((p, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-2">Cons</p>
                      <ul className="space-y-1.5">
                        {d.cons.map((c, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-rose-600 mt-0.5 shrink-0" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Best for</p>
                      <p className="text-xs text-slate-700">{d.bestFor}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function Step3() {
    const brokerages: { id: Brokerage; label: string; note: string }[] = [
      { id: "charles_schwab", label: "Charles Schwab", note: "$0 ETF commissions, integrated advisor portal" },
      { id: "fidelity", label: "Fidelity", note: "$0 ETF commissions, low margin rates" },
      { id: "interactive_brokers", label: "Interactive Brokers", note: "Best for futures/options (Series 3)" },
      { id: "td_ameritrade", label: "TD Ameritrade", note: "ThinkOrSwim platform — strong charting" },
      { id: "other", label: "Other", note: "Type the brokerage name below" },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Step 3 — Brokerage</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Where will the client open their account and place trades?
        </p>
        <div className="space-y-3 max-w-md">
          {brokerages.map((b) => (
            <label
              key={b.id}
              className={`flex items-start gap-3 bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
                brokerage === b.id
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name="brokerage"
                value={b.id}
                checked={brokerage === b.id}
                onChange={() => setBrokerage(b.id)}
                className="accent-indigo-600 w-4 h-4 mt-0.5"
              />
              <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-slate-700">{b.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{b.note}</p>
              </div>
            </label>
          ))}
          {brokerage === "other" && (
            <input
              type="text"
              placeholder="Enter brokerage name"
              value={otherBrokerage}
              onChange={(e) => setOtherBrokerage(e.target.value)}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-slate-700"
            />
          )}
        </div>
      </div>
    );
  }

  function Step4() {
    const timings: { id: StartTiming; label: string; note: string }[] = [
      { id: "immediately", label: "Immediately", note: "Open account this week, place first trade by next" },
      { id: "next_month", label: "Next Month", note: "Use the time to fund the account & monitor entry" },
      { id: "next_quarter", label: "Next Quarter", note: "Aligns with quarterly budget cycles" },
      { id: "custom", label: "Custom Date", note: "Pick a specific start date" },
    ];

    const frequencies: { id: RebalanceFrequency; label: string; note: string }[] = [
      { id: "monthly", label: "Monthly", note: "Tightest tracking; more trading activity" },
      { id: "quarterly", label: "Quarterly", note: "Recommended default — balances cost and drift" },
      { id: "semi_annually", label: "Semi-Annually", note: "Lowest cost; fine for stable usage patterns" },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Step 4 — Timeline</h2>
        <p className="text-slate-500 mb-6 text-sm">
          When does the program start, and how often do you reset the position size?
        </p>

        <div className="space-y-8 max-w-md">
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              When to Start
            </h3>
            <div className="space-y-2">
              {timings.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
                    startTiming === t.id
                      ? "border-indigo-500 ring-2 ring-indigo-200"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="timing"
                    value={t.id}
                    checked={startTiming === t.id}
                    onChange={() => setStartTiming(t.id)}
                    className="accent-indigo-600 w-4 h-4 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{t.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.note}</p>
                  </div>
                </label>
              ))}
              {startTiming === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full mt-2 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-slate-700"
                />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              Rebalancing Frequency
            </h3>
            <div className="space-y-2">
              {frequencies.map((f) => (
                <label
                  key={f.id}
                  className={`flex items-start gap-3 bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
                    rebalanceFrequency === f.id
                      ? "border-indigo-500 ring-2 ring-indigo-200"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value={f.id}
                    checked={rebalanceFrequency === f.id}
                    onChange={() => setRebalanceFrequency(f.id)}
                    className="accent-indigo-600 w-4 h-4 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{f.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{f.note}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function Step5() {
    const summaryRows = [
      { label: "Hedging Approach", value: approach ? APPROACH_DETAILS[approach as Exclude<HedgingApproach, "">].title : "" },
      { label: "Coverage Level", value: tierLabel(tier) },
      { label: "Instrument", value: productTicker },
      { label: "Brokerage", value: brokerageLabel(brokerage) },
      { label: "Start Date", value: timingLabel(startTiming) },
      { label: "Rebalancing", value: frequencyLabel(rebalanceFrequency) },
    ];

    const dealLabel = linkedDeal
      ? FEE_STRUCTURES.find((f) => f.value === linkedDeal.fee_structure)?.label ||
        linkedDeal.fee_structure
      : null;

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Step 5 — Review &amp; Generate
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          Generate the printable plan. The PDF will open in a new tab — your browser&apos;s
          print dialog will appear automatically. Pick &ldquo;Save as PDF.&rdquo;
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">
                Plan Summary — {companyName || `Company #${companyId}`}
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {summaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between items-center px-6 py-3"
                >
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span className="text-sm font-medium text-slate-800">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Your Compensation</h3>
            </div>
            {linkedDeal ? (
              <>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                  Linked deal #{linkedDeal.id}
                </p>
                <p className="text-xs text-slate-600 mb-3 capitalize">
                  {dealLabel}{" "}
                  {linkedDeal.fee_structure === "aum_percentage"
                    ? `· ${linkedDeal.fee_amount}% of $${linkedDeal.aum_value?.toLocaleString() || 0}`
                    : linkedDeal.fee_structure === "subscription"
                    ? `· $${linkedDeal.fee_amount}/mo`
                    : `· $${linkedDeal.fee_amount.toLocaleString()} flat`}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Year 1</span>
                    <span className="text-lg font-bold text-emerald-700">
                      ${projectedAdvisorRevenue(1).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">3 years</span>
                    <span className="text-sm font-semibold text-emerald-700">
                      ${projectedAdvisorRevenue(3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">5 years</span>
                    <span className="text-sm font-semibold text-emerald-700">
                      ${projectedAdvisorRevenue(5).toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-600 mb-3">
                  No deal linked. Annual fuel cost is roughly $
                  {Math.round(annualFuelCost).toLocaleString()};
                  a typical 1.0–1.5% AUM fee on a {Math.round(hedgeRatio * 100)}% hedge would
                  produce ~$
                  {Math.round(annualFuelCost * hedgeRatio * 0.0125).toLocaleString()}/yr.
                </p>
                <Link
                  href={`/deals?prefill_company=${companyId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Create deal <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>
        </div>

        {!planSaved ? (
          <button
            onClick={generatePlan}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Briefcase className="w-5 h-5" />
            {saving ? "Saving plan..." : "Generate & Save Implementation Plan"}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              Plan #{planSaved.id} saved. Print dialog should be open in the new tab.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const p = new URLSearchParams({
                    plan_id: String(planSaved.id),
                    approach,
                    tier,
                    hedge_ratio: String(hedgeRatio),
                    product_ticker: productTicker,
                    brokerage,
                    start_timing: startTiming,
                    rebalance_frequency: rebalanceFrequency,
                  });
                  if (brokerage === "other" && otherBrokerage) p.set("brokerage_other", otherBrokerage);
                  if (startTiming === "custom" && customDate) p.set("custom_date", customDate);
                  if (linkedDeal) p.set("deal_id", String(linkedDeal.id));
                  window.open(`/api/reports/implementation/${companyId}?${p}`, "_blank");
                }}
                className="py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Re-open print view
              </button>
              <Link
                href={`/companies/${companyId}`}
                className="py-3 rounded-xl font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                Back to {companyName || "Company"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  const stepContent = [
    <Step1 key="s1" />,
    <Step2 key="s2" />,
    <Step3 key="s3" />,
    <Step4 key="s4" />,
    <Step5 key="s5" />,
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/companies/${companyId}`}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            &larr; Back to {companyName || "Company"}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Implementation Plan Builder
          </h1>
          <p className="text-slate-500 text-sm">
            Build a printable hedging plan
            {companyName ? ` for ${companyName}` : ""}.
            {companyDeals.length > 0 && (
              <>
                {" "}
                {companyDeals.length} deal{companyDeals.length === 1 ? "" : "s"} on file
                {linkedDeal ? ` (using #${linkedDeal.id})` : ""}.
              </>
            )}
          </p>
        </div>

        {currentStep === 0 && <EducationPanel />}

        <ProgressBar />

        <div className="mb-8">{stepContent[currentStep]}</div>

        <div className="flex justify-between">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}
          {currentStep < STEPS.length - 1 && (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                canProceed()
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
