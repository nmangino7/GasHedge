"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { companiesApi } from "@/lib/api";
import type { Company } from "@/lib/types";
import { COMPANY_TYPES, PADD_LABELS } from "@/lib/constants";
import { Plus, Building2, ChevronRight, Loader2, AlertTriangle } from "lucide-react";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    companiesApi.list(filter || undefined)
      .then(setCompanies)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [filter]);

  const typeLabel = (type: string) => COMPANY_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">Manage client companies and fuel exposure</p>
        </div>
        <Link
          href="/companies/new"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Company
        </Link>
      </div>

      <div className="flex gap-1.5 mb-5">
        {["", "prospect", "active"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-md ${
              filter === s ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Loading companies...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-3">No companies yet</p>
          <Link href="/companies/new" className="text-sm text-gray-900 font-medium hover:underline">
            Add your first company
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-medium text-gray-900">{c.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      c.status === "active" ? "bg-green-50 text-green-700" :
                      c.status === "prospect" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{c.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{typeLabel(c.company_type)}</span>
                    <span>{c.fleet_size} vehicles</span>
                    <span className="capitalize">{c.fuel_type}</span>
                    <span>{PADD_LABELS[c.padd_region] || c.address_state}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">Monthly Gallons</p>
                    <p className="text-sm font-medium text-gray-900">
                      {((c.monthly_gallons_gasoline || 0) + (c.monthly_gallons_diesel || 0)).toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
