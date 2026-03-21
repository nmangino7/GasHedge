"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";

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

export default function ImplementationPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [companyName, setCompanyName] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [planGenerated, setPlanGenerated] = useState(false);

  // Step 1
  const [approach, setApproach] = useState<HedgingApproach>("");
  // Step 2
  const [tier, setTier] = useState<StrategyTier>("");
  // Step 3
  const [brokerage, setBrokerage] = useState<Brokerage>("");
  const [otherBrokerage, setOtherBrokerage] = useState("");
  // Step 4
  const [startTiming, setStartTiming] = useState<StartTiming>("");
  const [customDate, setCustomDate] = useState("");
  const [rebalanceFrequency, setRebalanceFrequency] =
    useState<RebalanceFrequency>("");

  useEffect(() => {
    fetch(`/api/companies/${companyId}`)
      .then((res) => res.json())
      .then((data) => setCompanyName(data.name ?? data.company_name ?? ""))
      .catch(() => setCompanyName("Unknown Company"));
  }, [companyId]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return approach !== "";
      case 1:
        return tier !== "";
      case 2:
        return brokerage !== "" && (brokerage !== "other" || otherBrokerage.trim() !== "");
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

  const hedgeRatio = tier === "conservative" ? 0.25 : tier === "moderate" ? 0.5 : 0.75;

  const estimatedCost = (ratio: number): string => {
    const base = approach === "etf" ? 0.01 : approach === "options" ? 0.005 : 0.002;
    return `~${(ratio * base * 100).toFixed(2)}% of fuel budget`;
  };

  const approachLabel = (a: HedgingApproach): string => {
    if (a === "etf") return "ETF-Based Hedging";
    if (a === "options") return "Options Contracts";
    if (a === "futures") return "Futures Contracts";
    return "";
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

  function generatePlan() {
    setPlanGenerated(true);
  }

  // --- Progress Bar ---
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
                    isCompleted
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : isActive
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-300 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "text-indigo-600"
                      : isCompleted
                      ? "text-indigo-600"
                      : "text-slate-400"
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

  // --- Step 1: Select Hedging Approach ---
  function Step1() {
    const approaches: {
      id: HedgingApproach;
      title: string;
      desc: string;
      icon: React.ReactNode;
      badge: string;
      badgeColor: string;
    }[] = [
      {
        id: "etf",
        title: "ETF-Based Hedging",
        desc: "Buy shares of fuel-correlated ETFs. No special license needed. Expense ratio ~0.8-1%.",
        icon: <BarChart3 className="w-6 h-6" />,
        badge: "Available Now",
        badgeColor: "bg-green-100 text-green-700",
      },
      {
        id: "options",
        title: "Options Contracts",
        desc: "Buy call options on fuel futures. Cheaper premium, capped downside. Requires Series 3 license.",
        icon: <Shield className="w-6 h-6" />,
        badge: "Series 3 Required",
        badgeColor: "bg-amber-100 text-amber-700",
      },
      {
        id: "futures",
        title: "Futures Contracts",
        desc: "Trade RBOB gasoline or ULSD diesel futures directly. Strongest correlation, lowest cost. Requires Series 3 license.",
        icon: <TrendingUp className="w-6 h-6" />,
        badge: "Series 3 Required",
        badgeColor: "bg-amber-100 text-amber-700",
      },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Select Hedging Approach
        </h2>
        <p className="text-slate-500 mb-6">
          Choose the instrument type for your fuel hedging program.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {approaches.map((a) => (
            <button
              key={a.id}
              onClick={() => setApproach(a.id)}
              className={`relative text-left bg-white rounded-xl border shadow-sm p-6 transition-all hover:shadow-md ${
                approach === a.id
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-slate-200"
              }`}
            >
              <span
                className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full ${a.badgeColor}`}
              >
                {a.badge}
              </span>
              <div className="text-indigo-600 mb-3">{a.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-2">{a.title}</h3>
              <p className="text-sm text-slate-500">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Step 2: Select Strategy Tier ---
  function Step2() {
    const tiers: {
      id: StrategyTier;
      label: string;
      pct: string;
      desc: string;
    }[] = [
      {
        id: "conservative",
        label: "Conservative",
        pct: "25%",
        desc: "Hedge 25% of fuel exposure. Lower cost, partial protection.",
      },
      {
        id: "moderate",
        label: "Moderate",
        pct: "50%",
        desc: "Hedge 50% of fuel exposure. Balanced cost and coverage.",
      },
      {
        id: "aggressive",
        label: "Aggressive",
        pct: "75%",
        desc: "Hedge 75% of fuel exposure. Maximum protection, higher cost.",
      },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Select Strategy Tier
        </h2>
        <p className="text-slate-500 mb-6">
          How much of your fuel budget do you want to hedge?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((t) => (
            <button
              key={t.id}
              onClick={() => setTier(t.id)}
              className={`text-left bg-white rounded-xl border shadow-sm p-6 transition-all hover:shadow-md ${
                tier === t.id
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-slate-200"
              }`}
            >
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                {t.pct}
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{t.label}</h3>
              <p className="text-sm text-slate-500 mb-3">{t.desc}</p>
              <div className="text-xs text-slate-400 font-medium">
                Est. cost: {estimatedCost(t.id === "conservative" ? 0.25 : t.id === "moderate" ? 0.5 : 0.75)}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Step 3: Brokerage Preference ---
  function Step3() {
    const brokerages: { id: Brokerage; label: string }[] = [
      { id: "charles_schwab", label: "Charles Schwab" },
      { id: "fidelity", label: "Fidelity" },
      { id: "interactive_brokers", label: "Interactive Brokers" },
      { id: "td_ameritrade", label: "TD Ameritrade" },
      { id: "other", label: "Other" },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Brokerage Preference
        </h2>
        <p className="text-slate-500 mb-6">
          Select your preferred brokerage for executing trades.
        </p>
        <div className="space-y-3 max-w-md">
          {brokerages.map((b) => (
            <label
              key={b.id}
              className={`flex items-center gap-3 bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
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
                className="accent-indigo-600 w-4 h-4"
              />
              <Building2 className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-700">{b.label}</span>
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

  // --- Step 4: Timeline ---
  function Step4() {
    const timings: { id: StartTiming; label: string }[] = [
      { id: "immediately", label: "Immediately" },
      { id: "next_month", label: "Next Month" },
      { id: "next_quarter", label: "Next Quarter" },
      { id: "custom", label: "Custom Date" },
    ];

    const frequencies: { id: RebalanceFrequency; label: string }[] = [
      { id: "monthly", label: "Monthly" },
      { id: "quarterly", label: "Quarterly" },
      { id: "semi_annually", label: "Semi-Annually" },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Timeline</h2>
        <p className="text-slate-500 mb-6">
          When should the hedging program begin and how often should it
          rebalance?
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
                  className={`flex items-center gap-3 bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
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
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">{t.label}</span>
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
                  className={`flex items-center gap-3 bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
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
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span className="font-medium text-slate-700">{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Step 5: Review & Generate ---
  function Step5() {
    const summaryRows = [
      { label: "Hedging Approach", value: approachLabel(approach) },
      { label: "Strategy Tier", value: tierLabel(tier) },
      { label: "Estimated Cost", value: estimatedCost(hedgeRatio) },
      { label: "Brokerage", value: brokerageLabel(brokerage) },
      { label: "Start Date", value: timingLabel(startTiming) },
      { label: "Rebalancing", value: frequencyLabel(rebalanceFrequency) },
    ];

    return (
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          Review &amp; Generate
        </h2>
        <p className="text-slate-500 mb-6">
          Review your selections and generate a printable implementation plan.
        </p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">
              Implementation Plan for {companyName || `Company #${companyId}`}
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

        {!planGenerated ? (
          <button
            onClick={generatePlan}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Briefcase className="w-5 h-5" />
            Generate Implementation Plan
          </button>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Implementation plan generated successfully.
            </div>
            <button
              onClick={() => window.print()}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print Plan
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Render ---
  const stepContent = [
    <Step1 key="s1" />,
    <Step2 key="s2" />,
    <Step3 key="s3" />,
    <Step4 key="s4" />,
    <Step5 key="s5" />,
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/companies/${companyId}`}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            &larr; Back to {companyName || "Company"}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Implementation Setup
          </h1>
          <p className="text-slate-500">
            Configure a fuel hedging program
            {companyName ? ` for ${companyName}` : ""}.
          </p>
        </div>

        {/* Progress */}
        <ProgressBar />

        {/* Step Content */}
        <div className="mb-8">{stepContent[currentStep]}</div>

        {/* Navigation */}
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
