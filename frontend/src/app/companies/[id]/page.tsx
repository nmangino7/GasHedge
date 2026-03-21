"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { companiesApi } from "@/lib/api";
import type { Company, ExposureData, BenchmarkData } from "@/lib/types";
import { COMPANY_TYPES, PADD_LABELS } from "@/lib/constants";
import { Shield, FileText, DollarSign, AlertTriangle } from "lucide-react";

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = Number(params.id);
  const [company, setCompany] = useState<Company | null>(null);
  const [exposure, setExposure] = useState<ExposureData | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      companiesApi.get(companyId),
      companiesApi.getExposure(companyId).catch(() => null),
      companiesApi.getBenchmark(companyId).catch(() => null),
    ]).then(([c, e, b]) => {
      setCompany(c);
      setExposure(e);
      setBenchmark(b);
    }).finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-48 mb-4"></div></div>;
  if (!company) return <p className="text-gray-500">Company not found.</p>;

  const typeLabel = COMPANY_TYPES.find((t) => t.value === company.company_type)?.label || company.company_type;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-gray-500">{typeLabel}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              company.status === "active" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
            }`}>{company.status}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/hedging/${company.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Shield className="h-4 w-4" /> Hedging Strategies
          </Link>
          <Link href={`/reports/${company.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
            <FileText className="h-4 w-4" /> Generate Report
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Company Profile</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Contact</span><span>{company.contact_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{company.contact_email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">State</span><span>{company.address_state}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Region</span><span>{PADD_LABELS[company.padd_region]}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fleet Size</span><span>{company.fleet_size}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fuel Type</span><span className="capitalize">{company.fuel_type}</span></div>
          </div>
        </div>

        {/* Fuel Exposure */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Fuel Exposure</h2>
          {exposure ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Monthly Cost</span><span className="font-semibold text-lg">${exposure.monthly_fuel_cost.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Annual Cost</span><span className="font-semibold text-lg text-red-600">${exposure.annual_fuel_cost.toLocaleString()}</span></div>
              {exposure.fuel_pct_revenue && (
                <div className="flex justify-between"><span className="text-gray-500">% of Revenue</span><span className="font-semibold">{exposure.fuel_pct_revenue}%</span></div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">If Prices Rise...</p>
                {exposure.scenarios.map((s) => (
                  <div key={s.label} className="flex justify-between py-1">
                    <span className="text-gray-500">{s.label}</span>
                    <span className="text-red-500 font-medium">+${s.additional_annual_cost.toLocaleString()}/yr</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Unable to calculate exposure. Check EIA API key.</p>
          )}
        </div>

        {/* Benchmark */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Industry Benchmark</h2>
          {benchmark ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Your Usage</span>
                <span className="font-semibold">{benchmark.company_monthly_gallons.toLocaleString()} gal/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Industry Avg</span>
                <span>{benchmark.industry_avg_monthly_gallons.toLocaleString()} gal/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comparison</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  benchmark.comparison === "above_average" ? "bg-red-100 text-red-700" :
                  benchmark.comparison === "below_average" ? "bg-green-100 text-green-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{benchmark.comparison.replace("_", " ")}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Industry range: {benchmark.industry_range.low.toLocaleString()} - {benchmark.industry_range.high.toLocaleString()} gal/mo
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Avg fuel as % of revenue: {benchmark.industry_avg_fuel_pct_revenue}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No benchmark data available for this company type.</p>
          )}
        </div>
      </div>
    </div>
  );
}
