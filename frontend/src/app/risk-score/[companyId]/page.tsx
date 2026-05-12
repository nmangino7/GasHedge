"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Shield, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
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

function scoreColor(score: number): string {
  if (score < 40) return "var(--positive)";
  if (score < 70) return "var(--warning)";
  return "var(--negative)";
}

function pillForScore(score: number): string {
  if (score < 40) return "pill-positive";
  if (score < 70) return "pill-warning";
  return "pill-negative";
}

function RiskGauge({ score }: { score: number }) {
  const strokeColor = scoreColor(score);
  const cx = 120;
  const cy = 120;
  const r = 100;
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalArc = Math.PI;
  const sweepAngle = totalArc * (score / 100);
  const currentAngle = startAngle - sweepAngle;
  const trackStartX = cx + r * Math.cos(startAngle);
  const trackStartY = cy - r * Math.sin(startAngle);
  const trackEndX = cx + r * Math.cos(endAngle);
  const trackEndY = cy - r * Math.sin(endAngle);
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
        <path d={trackPath} fill="none" stroke="var(--line)" strokeWidth="16" strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke={strokeColor} strokeWidth="16" strokeLinecap="round" />
        )}
        <text x={cx} y={cy - 10} textAnchor="middle" fill={strokeColor} fontSize="46" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {score}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--muted)" fontSize="12" fontWeight="600" letterSpacing="0.12em">
          OUT OF 100
        </text>
      </svg>
    </div>
  );
}

function ScoreBar({ score, benchmark }: { score: number; benchmark: number }) {
  return (
    <div className="relative w-full">
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(score, 100)}%`, background: scoreColor(score) }}
        />
      </div>
      <div
        className="absolute top-0 w-0.5 h-4 -translate-y-1"
        style={{ left: `${Math.min(benchmark, 100)}%`, background: "var(--muted)" }}
        title={`Industry benchmark: ${benchmark}`}
      />
    </div>
  );
}

function FactorCard({ factor }: { factor: RiskFactor }) {
  return (
    <div className="surface-raised p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[14px] text-[color:var(--ink)]">{factor.name}</h3>
        <span className="text-num text-[20px] font-bold" style={{ color: scoreColor(factor.score) }}>
          {factor.score}
        </span>
      </div>

      <ScoreBar score={factor.score} benchmark={factor.benchmark} />

      <div className="mt-1.5 mb-3 flex justify-between text-[10px] text-[color:var(--muted-2)]">
        <span>0</span>
        <span className="text-[color:var(--muted)]">Benchmark: {factor.benchmark}</span>
        <span>100</span>
      </div>

      <p className="text-[13px] text-[color:var(--ink-2)] mb-2 leading-relaxed">{factor.description}</p>
      <p className="text-[12px] text-[color:var(--muted)] italic leading-relaxed">{factor.recommendation}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "rising") {
    return (
      <span className="pill pill-negative">
        <TrendingUp className="w-3 h-3" />
        Prices Rising
      </span>
    );
  }
  if (trend === "falling") {
    return (
      <span className="pill pill-positive">
        <TrendingUp className="w-3 h-3 rotate-180" />
        Prices Falling
      </span>
    );
  }
  return (
    <span className="pill pill-neutral">
      <TrendingUp className="w-3 h-3" />
      Prices Stable
    </span>
  );
}

function SkeletonLoader() {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-48 bg-[color:var(--bg-elev)] rounded mb-2" />
      <div className="h-5 w-32 bg-[color:var(--bg-elev)] rounded mb-7" />
      <div className="flex justify-center mb-7">
        <div className="w-60 h-36 bg-[color:var(--bg-elev)] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-44 bg-[color:var(--bg-elev)] rounded-xl" />
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
  if (error) return <ErrorAlert message={error} />;
  if (!data) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <span className="h-section">Risk Assessment</span>
        <h1 className="font-display text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
          <Shield className="w-7 h-7 text-[color:var(--accent)]" />
          {data.company_name}
        </h1>
        <p className="text-sm text-[color:var(--muted)] mt-1.5">
          Composite score across {data.factors.length} risk factors, scored against industry benchmarks.
        </p>
      </div>

      {/* Gauge + Badge */}
      <div className="surface p-7 mb-7 flex flex-col items-center">
        <RiskGauge score={data.overall_score} />
        <div className="flex items-center gap-3 mt-3">
          <span className={`pill ${pillForScore(data.overall_score)} uppercase`} style={{ padding: "5px 14px", fontSize: "12px", letterSpacing: "0.06em" }}>
            {data.risk_level} Risk
          </span>
          <TrendBadge trend={data.trend} />
        </div>
        {data.volatility_data && (
          <p className="text-[11px] text-[color:var(--muted-2)] mt-3">
            Annualized volatility {(data.volatility_data.annualized_volatility * 100).toFixed(1)}% · {data.volatility_data.data_points} data points
          </p>
        )}
      </div>

      {/* Risk Factor Cards */}
      <h2 className="h-section mb-3">Risk Factors</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
        {data.factors.map((factor) => (
          <FactorCard key={factor.name} factor={factor} />
        ))}
      </div>

      {/* Action */}
      <div
        className="surface p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background:
            data.overall_score >= 70
              ? "var(--negative-tint)"
              : data.overall_score >= 40
              ? "var(--warning-tint)"
              : "var(--positive-tint)",
        }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{
              color:
                data.overall_score >= 70
                  ? "var(--negative)"
                  : data.overall_score >= 40
                  ? "var(--warning)"
                  : "var(--positive)",
            }}
          />
          <div>
            <p className="font-semibold text-[14px] text-[color:var(--ink)]">
              {data.overall_score >= 70
                ? "High risk detected — take action now"
                : data.overall_score >= 40
                ? "Moderate risk — consider hedging strategies"
                : "Low risk — maintain current strategy"}
            </p>
            <p className="text-[12px] text-[color:var(--muted)] mt-1">
              Review recommended hedging strategies tailored to this client's risk profile.
            </p>
          </div>
        </div>
        <Link href={`/hedging/${companyId}`} className="btn btn-accent shrink-0">
          View Strategies
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
