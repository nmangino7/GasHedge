"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { companiesApi, aiApi } from "@/lib/api";
import type { Company, ExposureData, BenchmarkData } from "@/lib/types";
import { COMPANY_TYPES, PADD_LABELS } from "@/lib/constants";
import { Shield, FileText, MessageSquare, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [company, setCompany] = useState<Company | null>(null);
  const [exposure, setExposure] = useState<ExposureData | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exposureError, setExposureError] = useState<string | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [exposureLoading, setExposureLoading] = useState(true);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadCompany();
  }, [companyId]);

  async function loadCompany() {
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

    // Load exposure and benchmark in background — don't block page
    setLoading(false);
    setExposureLoading(true);
    setExposureError(null);
    setBenchmarkLoading(true);
    setBenchmarkError(null);

    companiesApi.getExposure(companyId)
      .then(setExposure)
      .catch((e) => setExposureError(e instanceof Error ? e.message : String(e)))
      .finally(() => setExposureLoading(false));

    companiesApi.getBenchmark(companyId)
      .then(setBenchmark)
      .catch((e) => setBenchmarkError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBenchmarkLoading(false));
  }

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
        <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-700">Loading company...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <button onClick={loadCompany} className="mt-3 flex items-center gap-1.5 text-sm text-red-700 hover:text-red-900 font-medium">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!company) return <p className="text-sm text-gray-500">Company not found.</p>;

  const typeLabel = COMPANY_TYPES.find((t) => t.value === company.company_type)?.label || company.company_type;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{company.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{typeLabel}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              company.status === "active" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
            }`}>{company.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/hedging/${company.id}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium">
            <Shield className="h-3.5 w-3.5" /> Hedging Strategies
          </Link>
          <Link href={`/reports/${company.id}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">
            <FileText className="h-3.5 w-3.5" /> Report
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Company Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Company Profile</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Contact</span><span className="text-gray-900">{company.contact_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-900">{company.contact_email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">State</span><span className="text-gray-900">{company.address_state}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Region</span><span className="text-gray-900">{PADD_LABELS[company.padd_region]}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fleet Size</span><span className="text-gray-900">{company.fleet_size}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fuel Type</span><span className="text-gray-900 capitalize">{company.fuel_type}</span></div>
          </div>
        </div>

        {/* Fuel Exposure */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Fuel Exposure</h2>
          {exposureLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading exposure data...
            </div>
          ) : exposureError ? (
            <div className="text-xs text-red-600 bg-red-50 rounded p-3">
              <p className="font-medium mb-1">Failed to load exposure</p>
              <p className="text-red-500">{exposureError}</p>
            </div>
          ) : exposure ? (
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Monthly Cost</span><span className="text-gray-900 font-semibold text-lg">${exposure.monthly_fuel_cost.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Annual Cost</span><span className="text-red-700 font-semibold text-lg">${exposure.annual_fuel_cost.toLocaleString()}</span></div>
              {exposure.fuel_pct_revenue && (
                <div className="flex justify-between"><span className="text-gray-500">% of Revenue</span><span className="text-gray-900 font-medium">{exposure.fuel_pct_revenue}%</span></div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-400 uppercase mb-2">If Prices Rise</p>
                {exposure.scenarios.map((s) => (
                  <div key={s.label} className="flex justify-between py-0.5">
                    <span className="text-gray-500 text-xs">{s.label}</span>
                    <span className="text-red-600 text-xs font-medium">+${s.additional_annual_cost.toLocaleString()}/yr</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Benchmark */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Industry Benchmark</h2>
          {benchmarkLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading benchmark...
            </div>
          ) : benchmarkError ? (
            <div className="text-xs text-red-600 bg-red-50 rounded p-3">
              <p className="font-medium mb-1">Failed to load benchmark</p>
              <p className="text-red-500">{benchmarkError}</p>
            </div>
          ) : benchmark ? (
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Your Usage</span>
                <span className="text-gray-900 font-medium">{benchmark.company_monthly_gallons.toLocaleString()} gal/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Industry Avg</span>
                <span className="text-gray-900">{benchmark.industry_avg_monthly_gallons.toLocaleString()} gal/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comparison</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  benchmark.comparison === "above_average" ? "bg-red-50 text-red-700" :
                  benchmark.comparison === "below_average" ? "bg-green-50 text-green-700" :
                  "bg-blue-50 text-blue-700"
                }`}>{benchmark.comparison.replace("_", " ")}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Range: {benchmark.industry_range.low.toLocaleString()} - {benchmark.industry_range.high.toLocaleString()} gal/mo
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Avg fuel as % of revenue: {benchmark.industry_avg_fuel_pct_revenue}%
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Notes Section */}
      {company.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Notes & Context</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{company.notes}</p>
        </div>
      )}

      {/* AI Strategy Assistant */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> AI Strategy Assistant
        </h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAI()}
            placeholder="Ask about hedging strategies, fuel exposure, market conditions..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
          />
          <button
            onClick={askAI}
            disabled={aiLoading}
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </button>
        </div>
        {aiLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
          </div>
        )}
        {aiResponse && (
          <div className={`text-sm whitespace-pre-wrap rounded-md p-4 max-h-80 overflow-y-auto leading-relaxed ${
            aiResponse.startsWith("Error:") ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"
          }`}>
            {aiResponse}
          </div>
        )}
        {!aiResponse && !aiLoading && (
          <p className="text-xs text-gray-400">Powered by Claude. Ask questions specific to this company&apos;s fuel exposure and hedging options.</p>
        )}
      </div>
    </div>
  );
}
