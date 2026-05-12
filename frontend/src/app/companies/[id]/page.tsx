"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { companiesApi, aiApi, positionsApi } from "@/lib/api";
import type { Company, ExposureData, BenchmarkData } from "@/lib/types";
import type { LivePositionRow } from "@/lib/api";
import { COMPANY_TYPES, PADD_LABELS } from "@/lib/constants";
import {
  Shield,
  FileText,
  MessageSquare,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Calculator,
  ClipboardList,
  DollarSign,
  ArrowRight,
  Activity,
  Sparkles,
  Building2,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [company, setCompany] = useState<Company | null>(null);
  const [exposure, setExposure] = useState<ExposureData | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [positions, setPositions] = useState<LivePositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exposureError, setExposureError] = useState<string | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await companiesApi.get(companyId);
      setCompany(c);
    } catch (err) {
      setError(`Failed to load company: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
      return;
    }
    setLoading(false);

    companiesApi.getExposure(companyId).then(setExposure).catch((e) => setExposureError(e instanceof Error ? e.message : String(e)));
    companiesApi.getBenchmark(companyId).then(setBenchmark).catch((e) => setBenchmarkError(e instanceof Error ? e.message : String(e)));
    positionsApi.live({ companyId }).then((r) => setPositions(r.positions)).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void loadCompany();
  }, [companyId, loadCompany]);

  async function askAI() {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const data = await aiApi.ask(aiQuestion, companyId);
      setAiResponse(data.response);
    } catch (e) {
      setAiResponse(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-[color:var(--muted-2)] animate-spin mb-4" />
        <p className="text-sm font-medium text-[color:var(--ink-2)]">Loading client...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface p-5" style={{ borderColor: "var(--negative-tint)", background: "var(--negative-tint)" }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5" style={{ color: "var(--negative)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--negative)" }}>Error</p>
            <p className="text-sm text-[color:var(--ink-2)] mt-1">{error}</p>
          </div>
        </div>
        <button onClick={loadCompany} className="btn btn-ghost btn-sm mt-3">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!company) return <p className="text-sm text-[color:var(--muted)]">Client not found.</p>;

  const typeLabel =
    COMPANY_TYPES.find((t) => t.value === company.company_type)?.label || company.company_type;
  const openPositionsPnl = positions.reduce((acc, p) => acc + p.live.unrealized_pnl, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}
          >
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <span className="h-section">Client Profile</span>
            <h1 className="font-display text-3xl font-bold tracking-tight">{company.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm text-[color:var(--muted)]">{typeLabel}</span>
              <span className={`pill ${company.status === "active" ? "pill-positive" : "pill-teal"}`}>
                {company.status}
              </span>
              <span className="pill pill-outline capitalize">{company.fuel_type}</span>
              <span className="text-[12px] text-[color:var(--muted-2)]">{company.fleet_size} vehicles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {[
          { href: `/hedging/${company.id}`, label: "Strategy", icon: Shield, primary: true },
          { href: `/implementation/${company.id}`, label: "Plan", icon: ClipboardList },
          { href: `/risk-score/${company.id}`, label: "Risk", icon: AlertTriangle },
          { href: `/budget/${company.id}`, label: "Budget", icon: Calculator },
          { href: `/reports/${company.id}`, label: "Report", icon: FileText },
          { href: `/deals?prefill_company=${company.id}`, label: "Deals", icon: DollarSign },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
              a.primary
                ? "btn-accent"
                : "border border-[color:var(--line)] bg-[color:var(--bg-elev)] text-[color:var(--ink-2)] hover:bg-[color:var(--bg)] hover:border-[color:var(--line-strong)]"
            }`}
          >
            <a.icon className="h-3.5 w-3.5" /> {a.label}
          </Link>
        ))}
      </div>

      {/* Main 3-column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Profile */}
        <div className="surface p-5">
          <h2 className="h-section mb-3.5">Contact & Profile</h2>
          <div className="space-y-2 text-[13px]">
            <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Contact" value={company.contact_name} />
            <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={company.contact_email} />
            {company.contact_phone && (
              <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={company.contact_phone} />
            )}
            <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Region" value={`${company.address_state} · ${PADD_LABELS[company.padd_region]}`} />
          </div>
        </div>

        {/* Exposure */}
        <div className="surface p-5">
          <h2 className="h-section mb-3.5">Fuel Exposure</h2>
          {!exposure && !exposureError ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted-2)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : exposureError ? (
            <p className="text-xs text-[color:var(--negative)]">{exposureError}</p>
          ) : (
            <div className="space-y-2.5 text-[13px]">
              <KV label="Monthly Cost" value={`$${exposure!.monthly_fuel_cost.toLocaleString()}`} />
              <KV label="Annual Cost" value={`$${exposure!.annual_fuel_cost.toLocaleString()}`} valueColor="var(--negative)" bold />
              {exposure!.fuel_pct_revenue != null && (
                <KV label="% of Revenue" value={`${exposure!.fuel_pct_revenue}%`} />
              )}
              <div className="hr my-3" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--muted)] mb-1.5">
                Stress test
              </p>
              {exposure!.scenarios.map((s) => (
                <div key={s.label} className="flex justify-between text-[12px]">
                  <span className="text-[color:var(--muted)]">{s.label}</span>
                  <span className="text-num font-semibold" style={{ color: "var(--negative)" }}>
                    +${s.additional_annual_cost.toLocaleString()}/yr
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Benchmark */}
        <div className="surface p-5">
          <h2 className="h-section mb-3.5">Industry Benchmark</h2>
          {!benchmark && !benchmarkError ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted-2)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : benchmarkError ? (
            <p className="text-xs text-[color:var(--negative)]">{benchmarkError}</p>
          ) : (
            <div className="space-y-2.5 text-[13px]">
              <KV label="Your Usage" value={`${benchmark!.company_monthly_gallons.toLocaleString()} gal/mo`} bold />
              <KV label="Industry Avg" value={`${benchmark!.industry_avg_monthly_gallons.toLocaleString()} gal/mo`} />
              <div className="flex items-center justify-between">
                <span className="text-[color:var(--muted)]">Comparison</span>
                <span
                  className={`pill ${
                    benchmark!.comparison === "above_average"
                      ? "pill-warning"
                      : benchmark!.comparison === "below_average"
                      ? "pill-positive"
                      : "pill-teal"
                  }`}
                >
                  {benchmark!.comparison.replace("_", " ")}
                </span>
              </div>
              <div className="hr my-3" />
              <p className="text-[11px] text-[color:var(--muted)]">
                Industry range: {benchmark!.industry_range.low.toLocaleString()}–
                {benchmark!.industry_range.high.toLocaleString()} gal/mo · Avg fuel %:{" "}
                {benchmark!.industry_avg_fuel_pct_revenue}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Open positions for client */}
      {positions.length > 0 && (
        <div className="surface p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h-section flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Open Positions
            </h2>
            <Link href="/tracker" className="text-[11px] font-semibold text-[color:var(--accent)] hover:underline flex items-center gap-1">
              Full tracker <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Contract</th>
                <th className="right">Strike</th>
                <th className="right">Contracts</th>
                <th className="right">DTE</th>
                <th className="right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id}>
                  <td className="capitalize text-[12px]">{p.strategy_key.replace(/_/g, " ")}</td>
                  <td>
                    <span className="ticker text-[13px] font-bold">{p.ticker}</span>{" "}
                    <span className={`pill ml-1 ${p.side === "long" ? "pill-positive" : "pill-warning"}`}>
                      {p.side === "long" ? "L" : "S"} {p.option_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="right num">${p.strike.toFixed(2)}</td>
                  <td className="right num">{p.contracts}</td>
                  <td className="right num">{p.live.days_to_expiry}d</td>
                  <td
                    className="right num font-semibold"
                    style={{ color: p.live.unrealized_pnl >= 0 ? "var(--positive)" : "var(--negative)" }}
                  >
                    {p.live.unrealized_pnl >= 0 ? "+" : ""}${Math.abs(p.live.unrealized_pnl).toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr style={{ background: "var(--bg)" }}>
                <td colSpan={5} className="font-semibold">Net unrealized P&L</td>
                <td
                  className="right num font-bold"
                  style={{ color: openPositionsPnl >= 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {openPositionsPnl >= 0 ? "+" : ""}${Math.abs(openPositionsPnl).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {company.notes && (
        <div className="surface p-5 mb-6">
          <h2 className="h-section mb-2.5">Account Notes</h2>
          <p className="text-[13px] text-[color:var(--ink-2)] whitespace-pre-wrap leading-relaxed">{company.notes}</p>
        </div>
      )}

      {/* AI */}
      <div className="surface p-5">
        <h2 className="h-section mb-3 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> AI Strategy Assistant
          <span className="pill pill-accent text-[9px] py-0 ml-1">
            <Sparkles className="h-2.5 w-2.5" />
            Claude
          </span>
        </h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAI()}
            placeholder="e.g., What's the best collar structure for this client right now?"
            className="input flex-1"
          />
          <button onClick={askAI} disabled={aiLoading} className="btn btn-primary">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </button>
        </div>
        {aiResponse && (
          <div
            className="text-[13px] whitespace-pre-wrap rounded-lg p-4 max-h-96 overflow-y-auto leading-relaxed border"
            style={{
              background: aiResponse.startsWith("Error:") ? "var(--negative-tint)" : "var(--bg)",
              color: aiResponse.startsWith("Error:") ? "var(--negative)" : "var(--ink-2)",
              borderColor: "var(--line)",
            }}
          >
            {aiResponse}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[color:var(--muted-2)] shrink-0">{icon}</span>
      <span className="text-[color:var(--muted)] text-[12px] w-16 shrink-0">{label}</span>
      <span className="text-[color:var(--ink)] truncate" title={value}>{value}</span>
    </div>
  );
}

function KV({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:var(--muted)]">{label}</span>
      <span
        className={`text-num ${bold ? "font-semibold text-[15px]" : ""}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
