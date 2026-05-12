"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { dealsApi, companiesApi } from "@/lib/api";
import type { Deal, RevenueData, Company } from "@/lib/types";
import { DEAL_STAGES, FEE_STRUCTURES } from "@/lib/constants";
import {
  DollarSign,
  Users,
  TrendingUp,
  PlusCircle,
  Pencil,
  Trash2,
  FileText,
  Building2,
  ArrowRight,
  X,
} from "lucide-react";

type DealForm = {
  company_id: number;
  fee_structure: string;
  fee_amount: number;
  aum_value: number;
  notes: string;
};

const EMPTY_FORM: DealForm = {
  company_id: 0,
  fee_structure: "aum_percentage",
  fee_amount: 1.5,
  aum_value: 25000,
  notes: "",
};

const STAGE_PILL: Record<string, string> = {
  prospect: "pill-neutral",
  proposed: "pill-teal",
  signed: "pill-positive",
  active: "pill-positive",
  cancelled: "pill-negative",
};

const STAGE_TINT: Record<string, string> = {
  prospect: "rgba(255,255,255,0.08)",
  proposed: "rgba(13, 122, 114, 0.22)",
  signed: "rgba(21, 163, 92, 0.22)",
  active: "rgba(21, 163, 92, 0.32)",
  cancelled: "rgba(192, 57, 43, 0.22)",
};

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-6 bg-[color:var(--bg-elev)] rounded w-48" />}>
      <DealsPageInner />
    </Suspense>
  );
}

function DealsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCompanyId = searchParams.get("prefill_company");

  const [deals, setDeals] = useState<Deal[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Deal | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [postCreateDealId, setPostCreateDealId] = useState<number | null>(null);
  const [postCreateCompanyId, setPostCreateCompanyId] = useState<number | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (prefillCompanyId) {
      const id = Number(prefillCompanyId);
      setForm((f) => ({ ...f, company_id: id }));
      setShowCreate(true);
    }
  }, [prefillCompanyId]);

  async function loadData() {
    setLoading(true);
    try {
      const [d, r, c] = await Promise.all([dealsApi.list(), dealsApi.revenue(), companiesApi.list()]);
      setDeals(d);
      setRevenue(r);
      setCompanies(c);
      setForm((prev) => (prev.company_id === 0 && c.length > 0 ? { ...prev, company_id: c[0].id } : prev));
    } catch (e) {
      console.error("[Deals] loadData error:", e);
    }
    setLoading(false);
  }

  async function createDeal() {
    setSaving(true);
    try {
      const created = await dealsApi.create(form);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setPostCreateDealId(created.id);
      setPostCreateCompanyId(created.company_id);
      await loadData();
    } catch (e) {
      alert(`Failed to create deal: ${e instanceof Error ? e.message : String(e)}`);
    }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editingDeal) return;
    setSaving(true);
    try {
      await dealsApi.update(editingDeal.id, {
        company_id: form.company_id,
        fee_structure: form.fee_structure,
        fee_amount: form.fee_amount,
        aum_value: form.aum_value,
        notes: form.notes,
      });
      setEditingDeal(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (e) {
      alert(`Failed to update deal: ${e instanceof Error ? e.message : String(e)}`);
    }
    setSaving(false);
  }

  async function deleteDeal() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await dealsApi.delete(confirmDelete.id);
      setConfirmDelete(null);
      await loadData();
    } catch (e) {
      alert(`Failed to delete: ${e instanceof Error ? e.message : String(e)}`);
    }
    setSaving(false);
  }

  async function updateDealStatus(dealId: number, status: string) {
    try {
      await dealsApi.update(dealId, { status });
      await loadData();
    } catch (e) {
      console.error("[Deals] update status error:", e);
    }
  }

  function openEdit(deal: Deal) {
    setForm({
      company_id: deal.company_id,
      fee_structure: deal.fee_structure,
      fee_amount: deal.fee_amount,
      aum_value: deal.aum_value ?? 0,
      notes: deal.notes ?? "",
    });
    setEditingDeal(deal);
  }

  const filteredDeals = useMemo(
    () => (filter === "all" ? deals : deals.filter((d) => d.status === filter)),
    [deals, filter]
  );

  const pipelineByStage = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const stage of DEAL_STAGES) map[stage.value] = { count: 0, revenue: 0 };
    for (const deal of deals) {
      if (!map[deal.status]) map[deal.status] = { count: 0, revenue: 0 };
      map[deal.status].count += 1;
      map[deal.status].revenue += deal.annual_fee_revenue;
    }
    return map;
  }, [deals]);

  const stageLabel = (status: string) => DEAL_STAGES.find((s) => s.value === status)?.label || status;
  const formValid = form.company_id > 0 && form.fee_amount > 0;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-9 bg-[color:var(--bg-elev)] rounded w-64" />
        <div className="h-20 bg-[color:var(--bg-elev)] rounded" />
        <div className="h-32 bg-[color:var(--bg-elev)] rounded" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <span className="h-section">Pipeline & Revenue</span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Deals & Revenue</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1.5">
            Every advisory engagement, fee structure, and pipeline value in one place.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowCreate(true);
          }}
          className="btn btn-accent"
        >
          <PlusCircle className="h-4 w-4" /> New Deal
        </button>
      </div>

      {/* Pipeline strip */}
      <div className="surface-deep p-5 mb-6 overflow-x-auto" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">Pipeline</span>
          <span className="text-[10px] text-white/45">
            {deals.length} deal{deals.length === 1 ? "" : "s"} · $
            {deals.reduce((s, d) => s + d.annual_fee_revenue, 0).toLocaleString()}/yr total
          </span>
        </div>
        <div className="flex gap-2 min-w-max">
          {DEAL_STAGES.map((stage) => {
            const data = pipelineByStage[stage.value] || { count: 0, revenue: 0 };
            const isActive = filter === stage.value;
            return (
              <button
                key={stage.value}
                onClick={() => setFilter(stage.value)}
                className="flex-1 min-w-[130px] rounded-xl p-3 text-left transition-all"
                style={{
                  background: STAGE_TINT[stage.value] || "rgba(255,255,255,0.05)",
                  boxShadow: isActive ? "inset 0 0 0 2px rgba(255,255,255,0.55)" : undefined,
                }}
              >
                <p className="text-[10px] uppercase tracking-wider text-white/65 font-semibold">{stage.label}</p>
                <p className="text-num text-[22px] font-bold text-white mt-0.5">${Math.round(data.revenue / 1000)}k</p>
                <p className="text-[11px] text-white/55 mt-0.5">{data.count} deal{data.count === 1 ? "" : "s"}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-md transition-colors"
          style={{
            background: filter === "all" ? "var(--ink)" : "transparent",
            color: filter === "all" ? "#fff" : "var(--ink-2)",
            border: `1px solid ${filter === "all" ? "var(--ink)" : "var(--line)"}`,
          }}
        >
          All ({deals.length})
        </button>
        {DEAL_STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md transition-colors"
            style={{
              background: filter === s.value ? "var(--ink)" : "transparent",
              color: filter === s.value ? "#fff" : "var(--ink-2)",
              border: `1px solid ${filter === s.value ? "var(--ink)" : "var(--line)"}`,
            }}
          >
            {s.label} ({pipelineByStage[s.value]?.count || 0})
          </button>
        ))}
      </div>

      {/* Revenue KPIs */}
      {revenue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Annual Advisor Revenue", value: `$${revenue.total_annual_revenue.toLocaleString()}`, icon: DollarSign, accent: "accent" as const },
            { label: "Monthly Run Rate", value: `$${revenue.total_monthly_revenue.toLocaleString()}`, icon: DollarSign, accent: "teal" as const },
            { label: "Active Deals", value: revenue.active_deals.toString(), icon: Users, accent: "positive" as const },
            { label: "Pipeline Value", value: `$${revenue.pipeline_value.toLocaleString()}`, icon: TrendingUp, accent: "ink" as const },
          ].map((card) => (
            <div key={card.label} className={`kpi kpi-${card.accent}`}>
              <div className="kpi-label flex items-center gap-1.5">
                <card.icon className="h-3 w-3" /> {card.label}
              </div>
              <div className="kpi-value">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top clients */}
      {revenue && revenue.top_clients.length > 0 && (
        <div className="surface mb-6" style={{ padding: 0, overflow: "hidden" }}>
          <h2 className="h-section px-5 pt-5 pb-3">Top Clients by Advisor Revenue</h2>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="right">Annual Revenue</th>
                  <th className="right">Deals</th>
                  <th className="right">3-Year Value</th>
                </tr>
              </thead>
              <tbody>
                {revenue.top_clients.map((c) => (
                  <tr key={c.company_id}>
                    <td>
                      <Link href={`/companies/${c.company_id}`} className="hover:text-[color:var(--accent)] font-semibold">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="right num">${c.annual_revenue.toLocaleString()}</td>
                    <td className="right num">{c.deal_count}</td>
                    <td className="right num font-semibold" style={{ color: "var(--positive)" }}>
                      ${(c.annual_revenue * 3).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deals table */}
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="h-section">
            {filter === "all" ? "All Deals" : stageLabel(filter) + " Deals"}
          </h2>
          <span className="text-[11px] text-[color:var(--muted-2)]">{filteredDeals.length} shown</span>
        </div>

        {filteredDeals.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-2)] text-center py-12">
            {filter === "all" ? "No deals yet. Create one to start tracking revenue." : `No ${stageLabel(filter).toLowerCase()} deals.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Fee Type</th>
                  <th className="right">Fee</th>
                  <th className="right" style={{ background: "var(--positive-tint)" }}>Annual Comp</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link
                        href={`/companies/${d.company_id}`}
                        className="font-semibold text-[color:var(--ink)] hover:text-[color:var(--accent)] inline-flex items-center gap-1"
                      >
                        <Building2 className="h-3 w-3 text-[color:var(--muted-2)]" />
                        {d.company_name || `Company #${d.company_id}`}
                      </Link>
                      {d.notes && <p className="text-[11px] text-[color:var(--muted-2)] mt-0.5 max-w-xs truncate">{d.notes}</p>}
                    </td>
                    <td className="capitalize">{d.fee_structure.replace("_", " ")}</td>
                    <td className="right num">
                      {d.fee_structure === "aum_percentage" ? `${d.fee_amount}%` : `$${d.fee_amount.toLocaleString()}`}
                    </td>
                    <td className="right num font-semibold" style={{ background: "var(--positive-tint)", color: "var(--positive)" }}>
                      ${d.annual_fee_revenue.toLocaleString()}
                    </td>
                    <td>
                      <select
                        value={d.status}
                        onChange={(e) => updateDealStatus(d.id, e.target.value)}
                        className={`pill ${STAGE_PILL[d.status] || "pill-neutral"} text-[11px] py-0 cursor-pointer`}
                        style={{ borderWidth: 0 }}
                      >
                        {DEAL_STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/implementation/${d.company_id}?deal_id=${d.id}`}
                          title="Build / view hedging plan"
                          className="p-1.5 rounded text-[color:var(--muted)] hover:bg-[color:var(--bg)] hover:text-[color:var(--accent)]"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => openEdit(d)}
                          title="Edit deal"
                          className="p-1.5 rounded text-[color:var(--muted)] hover:bg-[color:var(--bg)] hover:text-[color:var(--ink)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(d)}
                          title="Delete deal"
                          className="p-1.5 rounded text-[color:var(--muted)] hover:text-[color:var(--negative)]"
                          style={{ "--hover-bg": "var(--negative-tint)" } as React.CSSProperties}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {(showCreate || editingDeal) && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          style={{ background: "rgba(11,18,32,0.55)" }}
          onClick={() => {
            setShowCreate(false);
            setEditingDeal(null);
          }}
        >
          <div className="surface w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[18px] font-bold tracking-tight">
                {editingDeal ? "Edit Deal" : "Create New Deal"}
              </h3>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingDeal(null);
                }}
                className="p-1 rounded hover:bg-[color:var(--bg)] text-[color:var(--muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">Company</span>
                <select
                  value={form.company_id}
                  onChange={(e) => setForm({ ...form, company_id: parseInt(e.target.value) })}
                  className="select"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">Fee Structure</span>
                <select
                  value={form.fee_structure}
                  onChange={(e) => setForm({ ...form, fee_structure: e.target.value })}
                  className="select"
                >
                  {FEE_STRUCTURES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-[color:var(--muted-2)] mt-1">
                  {FEE_STRUCTURES.find((f) => f.value === form.fee_structure)?.description}
                </p>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">
                  {form.fee_structure === "aum_percentage" ? "Fee %" : form.fee_structure === "subscription" ? "Monthly Amount ($)" : "Flat Fee ($)"}
                </span>
                <input
                  type="number"
                  value={form.fee_amount}
                  step={form.fee_structure === "aum_percentage" ? 0.1 : 100}
                  onChange={(e) => setForm({ ...form, fee_amount: parseFloat(e.target.value) || 0 })}
                  className="input"
                />
              </label>
              {form.fee_structure === "aum_percentage" && (
                <label className="block">
                  <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">AUM Value ($)</span>
                  <input
                    type="number"
                    value={form.aum_value}
                    onChange={(e) => setForm({ ...form, aum_value: parseFloat(e.target.value) || 0 })}
                    className="input"
                  />
                  <p className="text-[11px] text-[color:var(--muted-2)] mt-1">
                    Estimated annual fee: ${Math.round(form.aum_value * (form.fee_amount / 100)).toLocaleString()}
                  </p>
                </label>
              )}
              {form.fee_structure === "subscription" && (
                <p className="text-[11px] text-[color:var(--muted-2)]">
                  Annual revenue from this deal: ${(form.fee_amount * 12).toLocaleString()}
                </p>
              )}
              <label className="block">
                <span className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="textarea resize-none"
                  rows={2}
                  placeholder="e.g. 50% hedge on diesel via USO"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingDeal(null);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button onClick={editingDeal ? saveEdit : createDeal} disabled={!formValid || saving} className="btn btn-accent">
                {saving ? "Saving..." : editingDeal ? "Save Changes" : "Create Deal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-create CTA */}
      {postCreateDealId && postCreateCompanyId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          style={{ background: "rgba(11,18,32,0.55)" }}
        >
          <div className="surface w-full max-w-sm p-6">
            <h3 className="font-display text-[17px] font-bold tracking-tight mb-1">Deal Created</h3>
            <p className="text-[13px] text-[color:var(--ink-2)] mb-4 leading-relaxed">
              Build the hedging implementation plan now? Takes 2 minutes.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setPostCreateDealId(null);
                  setPostCreateCompanyId(null);
                }}
                className="btn btn-ghost btn-sm"
              >
                Later
              </button>
              <button
                onClick={() => router.push(`/implementation/${postCreateCompanyId}?deal_id=${postCreateDealId}`)}
                className="btn btn-accent btn-sm"
              >
                Build plan now <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          style={{ background: "rgba(11,18,32,0.55)" }}
          onClick={() => setConfirmDelete(null)}
        >
          <div className="surface w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-[17px] font-bold tracking-tight mb-2">Delete this deal?</h3>
            <p className="text-[13px] text-[color:var(--ink-2)] mb-4 leading-relaxed">
              <strong>{confirmDelete.company_name}</strong> — <span className="capitalize">{confirmDelete.fee_structure.replace("_", " ")}</span> · $
              {confirmDelete.annual_fee_revenue.toLocaleString()}/yr.
              <br />
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost btn-sm">Cancel</button>
              <button
                onClick={deleteDeal}
                disabled={saving}
                className="btn btn-sm"
                style={{ background: "var(--negative)", color: "#fff", borderColor: "var(--negative)" }}
              >
                {saving ? "Deleting..." : "Delete deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
