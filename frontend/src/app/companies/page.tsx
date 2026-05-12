"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { companiesApi } from "@/lib/api";
import type { Company } from "@/lib/types";
import { COMPANY_TYPES, PADD_LABELS } from "@/lib/constants";
import { Plus, Building2, AlertTriangle, Loader2, Fuel, ArrowRight, Search } from "lucide-react";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    companiesApi
      .list(filter || undefined)
      .then(setCompanies)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [filter]);

  const typeLabel = (type: string) => COMPANY_TYPES.find((t) => t.value === type)?.label || type;
  const filtered = companies.filter((c) =>
    query ? c.name.toLowerCase().includes(query.toLowerCase()) : true
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <span className="h-section">Client Book</span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Companies</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1.5">
            {companies.length} {companies.length === 1 ? "client" : "clients"} · fleet exposure across PADD regions
          </p>
        </div>
        <Link href="/companies/new" className="btn btn-accent">
          <Plus className="h-4 w-4" /> Add Client
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="flex gap-1.5">
          {["", "prospect", "active"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: filter === s ? "var(--ink)" : "transparent",
                color: filter === s ? "#fff" : "var(--ink-2)",
                border: `1px solid ${filter === s ? "var(--ink)" : "var(--line)"}`,
              }}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="md:ml-auto md:max-w-xs flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-2)] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients..."
            className="input pl-9"
          />
        </div>
      </div>

      {error && (
        <div
          className="surface p-4 mb-4 flex items-start gap-3"
          style={{ borderColor: "var(--negative-tint)", background: "var(--negative-tint)" }}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: "var(--negative)" }} />
          <p className="text-sm" style={{ color: "var(--negative)" }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-[color:var(--muted-2)] animate-spin mb-3" />
          <p className="text-sm text-[color:var(--muted)]">Loading clients...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-16 text-center">
          <Building2 className="h-10 w-10 text-[color:var(--muted-2)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[color:var(--ink)] mb-1">
            {query ? "No matches" : "No clients yet"}
          </p>
          <p className="text-xs text-[color:var(--muted)] mb-4">
            {query ? "Try a different search term." : "Add your first client to start building a hedging book."}
          </p>
          {!query && (
            <Link href="/companies/new" className="btn btn-accent btn-sm">
              <Plus className="h-3.5 w-3.5" /> Add Client
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`} className="surface-raised p-5 flex items-start gap-4 group">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-[color:var(--ink)] group-hover:text-[color:var(--accent)] truncate">
                    {c.name}
                  </h3>
                  <span
                    className={`pill ${
                      c.status === "active"
                        ? "pill-positive"
                        : c.status === "prospect"
                        ? "pill-teal"
                        : "pill-neutral"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-[12px] text-[color:var(--muted)] mt-1">
                  {typeLabel(c.company_type)} · {c.fleet_size} vehicles · {PADD_LABELS[c.padd_region] || c.address_state}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[12px]">
                  <span className="pill pill-outline">
                    <Fuel className="h-3 w-3" />
                    {c.fuel_type}
                  </span>
                  <span className="text-num text-[color:var(--ink-2)] font-semibold">
                    {((c.monthly_gallons_gasoline || 0) + (c.monthly_gallons_diesel || 0)).toLocaleString()} gal/mo
                  </span>
                  {c.annual_revenue != null && (
                    <span className="text-[11px] text-[color:var(--muted)]">
                      · ${(c.annual_revenue / 1000000).toFixed(1)}M rev
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[color:var(--muted-2)] group-hover:text-[color:var(--accent)] mt-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
