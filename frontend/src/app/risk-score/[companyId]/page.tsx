"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Shield, TrendingUp, AlertTriangle } from "lucide-react";
import ErrorAlert from "@/components/ErrorAlert";

interface RiskFactor {
  name: string;
  score: number;
  benchmark: number;
  description: string;
  recommendation: string;
}

interface RiskData {
  company_id: number;
  company_name: string;
  overall_score: number;
  risk_level: "low" | "moderate" | "high";
  factors: RiskFactor[];
  trend: string;
  volatility_data: {
    annualized_volatility: number;
    weekly_volatility: number;
    trend: string;
    data_points: number;
  } | null;
}

function scoreColor(score: number) {
  if (score < 40) return "emerald";
  if (score < 70) return "amber";
  return "rose";
}

function scoreBgClass(score: number) {
  if (score < 40) return "bg-emerald-500";
  if (score < 70) return "bg-amber-500";
  return "bg-rose-500";
}

function scoreTextClass(score: number) {
  if (score < 40) return "text-emerald-600";
  if (score < 70) return "text-amber-600";
  return "text-rose-600";
}

function scoreBadgeBgClass(score: number) {
  if (score < 40) return "bg-emerald-100 text-emerald-800";
  if (score < 70) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function RiskGauge({ score }: { score: number }) {
  const color = scoreColor(score);
  const strokeColor =
    color === "emerald"
      ? "#10b981"
      : color === "amber"
        ? "#f59e0b"
        : "#f43f5e";

  // Semi-circle arc parameters
  const cx = 120;
  const cy = 120;
  const r = 100;
  const startAngle = Math.PI; // 180 degrees (left)
  const endAngle = 0; // 0 degrees (right)
  const totalArc = Math.PI; // 180 degrees

  // Calculate the sweep based on score (0-100)
  const sweepAngle = totalArc * (score / 100);
  const currentAngle = startAngle - sweepAngle;

  // Arc path for the background track
  const trackStartX = cx + r * Math.cos(startAngle);
  const trackStartY = cy - r * Math.sin(startAngle);
  const trackEndX = cx + r * Math.cos(endAngle);
  const trackEndY = cy - r * Math.sin(endAngle);

  // Arc path for the filled portion
  const fillEndX = cx + r * Math.cos(currentAngle);
  const fillEndY = cy - r * Math.sin(currentAngle);
  const largeArcFlag = sweepAngle > Math.PI ? 1 : 0;

  const trackPath = `M ${trackStartX} ${trackStartY} A ${r} ${r} 0 0 1 ${trackEndX} ${trackEndY}`;
  const fillPath =
    score > 0
      ? `M ${trackStartX} ${trackStartY} A ${r} ${r} 0 ${largeArcFlag} 1 ${fillEndX} ${fillEndY}`
      : "";

  return (
    <div className="flex flex-col items-center">
      <svg width="240" height="140" viewBox="0 0 240 140">
        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="16"
            strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="text-4xl font-bold"
          fill={strokeColor}
          fontSize="48"
          fontWeight="700"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fill="#64748b"
          fontSize="14"
        >
          out of 100
        </text>
      </svg>
    </div>
  );
}

function ScoreBar({ score, benchmark }: { score: number; benchmark: number }) {
  return (
    <div className="relative w-full">
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${scoreBgClass(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      {/* Benchmark marker */}
      <div
        className="absolute top-0 w-0.5 h-4 bg-slate-400 -translate-y-1"
        style={{ left: `${Math.min(benchmark, 100)}%` }}
        title={`Industry benchmark: ${benchmark}`}
      />
    </div>
  );
}

function FactorCard({ factor }: { factor: RiskFactor }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">{factor.name}</h3>
        <span className={`text-lg font-bold ${scoreTextClass(factor.score)}`}>
          {factor.score}
        </span>
      </div>

      <ScoreBar score={factor.score} benchmark={factor.benchmark} />

      <div className="mt-1 mb-3 flex justify-between text-xs text-slate-400">
        <span>0</span>
        <span className="text-slate-500">
          Benchmark: {factor.benchmark}
        </span>
        <span>100</span>
      </div>

      <p className="text-sm text-slate-600 mb-2">{factor.description}</p>
      <p className="text-sm text-slate-500 italic">{factor.recommendation}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "rising") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-medium">
        <TrendingUp className="w-4 h-4" />
        Prices Rising
      </span>
    );
  }
  if (trend === "falling") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
        <TrendingUp className="w-4 h-4 rotate-180" />
        Prices Falling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
      <TrendingUp className="w-4 h-4" />
      Prices Stable
    </span>
  );
}

function SkeletonLoader() {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
      <div className="h-5 w-32 bg-slate-200 rounded mb-8" />
      <div className="flex justify-center mb-8">
        <div className="w-60 h-36 bg-slate-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-48 bg-slate-200 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}

export default function RiskScorePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/risk-score/${companyId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <SkeletonLoader />;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorAlert message={error} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-7 h-7 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Risk Assessment</h1>
        </div>
        <p className="text-slate-500 ml-10">{data.company_name}</p>
      </div>

      {/* Gauge + Badge + Trend */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 flex flex-col items-center">
        <RiskGauge score={data.overall_score} />

        <div className="flex items-center gap-4 mt-4">
          <span
            className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wide ${scoreBadgeBgClass(data.overall_score)}`}
          >
            {data.risk_level} Risk
          </span>
          <TrendBadge trend={data.trend} />
        </div>

        {data.volatility_data && (
          <p className="text-xs text-slate-400 mt-3">
            Annualized volatility:{" "}
            {(data.volatility_data.annualized_volatility * 100).toFixed(1)}% based
            on {data.volatility_data.data_points} data points
          </p>
        )}
      </div>

      {/* Risk Factor Cards */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Risk Factors</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {data.factors.map((factor) => (
          <FactorCard key={factor.name} factor={factor} />
        ))}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-slate-800">
              {data.overall_score >= 70
                ? "High risk detected — take action now"
                : data.overall_score >= 40
                  ? "Moderate risk — consider hedging strategies"
                  : "Low risk — maintain current strategy"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Review recommended hedging strategies tailored to your risk profile.
            </p>
          </div>
        </div>
        <Link
          href={`/hedging/${companyId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shrink-0"
        >
          View Hedging Strategies
        </Link>
      </div>
    </div>
  );
}
