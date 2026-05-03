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

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-6 bg-gray-100 rounded w-48" />}>
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
    loadData();
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
      const [d, r, c] = await Promise.all([
        dealsApi.list(),
        dealsApi.revenue(),
        companiesApi.list(),
      ]);
      setDeals(d);
      setRevenue(r);
      setCompanies(c);
      setForm((prev) =>
        prev.company_id === 0 && c.length > 0
          ? { ...prev, company_id: c[0].id }
          : prev
      );
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
    () =>
      filter === "all"
        ? deals
        : deals.filter((d) => d.status === filter),
    [deals, filter]
  );

  const pipelineByStage = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const stage of DEAL_STAGES) {
      map[stage.value] = { count: 0, revenue: 0 };
    }
    for (const deal of deals) {
      if (!map[deal.status]) map[deal.status] = { count: 0, revenue: 0 };
      map[deal.status].count += 1;
      map[deal.status].revenue += deal.annual_fee_revenue;
    }
    return map;
  }, [deals]);

  const stageColor = (status: string) =>
    DEAL_STAGES.find((s) => s.value === status)?.color || "bg-gray-100 text-gray-700";

  const stageLabel = (status: string) =>
    DEAL_STAGES.find((s) => s.value === status)?.label || status;

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 outline-none";

  const formValid = form.company_id > 0 && form.fee_amount > 0;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-100 rounded w-48"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
        <div className="h-32 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deals & Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track every advisory engagement, your fee per client, and pipeline value
          </p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowCreate(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium"
        >
          <PlusCircle className="h-4 w-4" /> New Deal
        </button>
      </div>

      {/* Pipeline strip */}
      <div className="bg-slate-900 rounded-2xl p-4 mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline</span>
          <span className="text-[10px] text-slate-500">
            {deals.length} deal{deals.length === 1 ? "" : "s"} · ${
              deals.reduce((s, d) => s + d.annual_fee_revenue, 0).toLocaleString()
            }/yr total
          </span>
        </div>
        <div className="flex gap-2 min-w-max">
          {DEAL_STAGES.map((stage) => {
            const data = pipelineByStage[stage.value] || { count: 0, revenue: 0 };
            const stageBg: Record<string, string> = {
              prospect: "bg-slate-700/40",
              proposed: "bg-blue-600/30",
              signed: "bg-emerald-600/30",
              active: "bg-emerald-500/40",
              cancelled: "bg-rose-600/30",
            };
            return (
              <button
                key={stage.value}
                onClick={() => setFilter(stage.value)}
                className={`flex-1 min-w-[120px] rounded-xl p-3 text-left transition-all ${
                  filter === stage.value
                    ? "ring-2 ring-white/40 " + (stageBg[stage.value] || "bg-slate-700/40")
                    : (stageBg[stage.value] || "bg-slate-700/40") + " hover:ring-1 hover:ring-white/20"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">{stage.label}</p>
                <p className="text-xl font-bold text-white mt-0.5">
                  ${Math.round(data.revenue / 1000)}k
                </p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  {data.count} deal{data.count === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            filter === "all"
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          All ({deals.length})
        </button>
        {DEAL_STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === s.value
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s.label} ({pipelineByStage[s.value]?.count || 0})
          </button>
        ))}
      </div>

      {/* Revenue summary */}
      {revenue && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Annual Advisor Revenue", value: `$${revenue.total_annual_revenue.toLocaleString()}`, icon: DollarSign },
            { label: "Monthly Run Rate", value: `$${revenue.total_monthly_revenue.toLocaleString()}`, icon: DollarSign },
            { label: "Active Deals", value: revenue.active_deals.toString(), icon: Users },
            { label: "Pipeline Value", value: `$${revenue.pipeline_value.toLocaleString()}`, icon: TrendingUp },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <card.icon className="h-3.5 w-3.5" /> {card.label}
              </div>
              <p className="text-xl font-semibold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top clients */}
      {revenue && revenue.top_clients.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Top Clients by Advisor Revenue</h2>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Company</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Annual Revenue</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Deals</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">3-Year Value</th>
                </tr>
              </thead>
              <tbody>
                {revenue.top_clients.map((c) => (
                  <tr key={c.company_id} className="border-b border-gray-50">
                    <td className="py-2 px-3 text-gray-900 font-medium">
                      <Link href={`/companies/${c.company_id}`} className="hover:text-indigo-600">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700">
                      ${c.annual_revenue.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700">{c.deal_count}</td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-medium">
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
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {filter === "all" ? "All Deals" : stageLabel(filter) + " Deals"}
          </h2>
          <span className="text-xs text-gray-400">{filteredDeals.length} shown</span>
        </div>

        {filteredDeals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            {filter === "all"
              ? "No deals yet. Create one to start tracking revenue."
              : `No ${stageLabel(filter).toLowerCase()} deals.`}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Company</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Fee Type</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Fee</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium bg-emerald-50">Your Annual Comp</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/companies/${d.company_id}`}
                        className="text-gray-900 font-medium hover:text-indigo-600 inline-flex items-center gap-1"
                      >
                        <Building2 className="h-3 w-3 text-gray-400" />
                        {d.company_name || `Company #${d.company_id}`}
                      </Link>
                      {d.notes && (
                        <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs truncate">{d.notes}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 capitalize">
                      {d.fee_structure.replace("_", " ")}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700">
                      {d.fee_structure === "aum_percentage"
                        ? `${d.fee_amount}%`
                        : `$${d.fee_amount.toLocaleString()}`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold bg-emerald-50/40">
                      ${d.annual_fee_revenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <select
                        value={d.status}
                        onChange={(e) => updateDealStatus(d.id, e.target.value)}
                        className={`text-[11px] font-medium rounded-full px-2 py-0.5 border-0 ${stageColor(d.status)}`}
                      >
                        {DEAL_STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/implementation/${d.company_id}?deal_id=${d.id}`}
                          title="Build / view hedging plan"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => openEdit(d)}
                          title="Edit deal"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(d)}
                          title="Delete deal"
                          className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
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
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCreate(false);
            setEditingDeal(null);
          }}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md border border-gray-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {editingDeal ? "Edit Deal" : "Create New Deal"}
              </h3>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingDeal(null);
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={form.company_id}
                  onChange={(e) =>
                    setForm({ ...form, company_id: parseInt(e.target.value) })
                  }
                  className={inputClass}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fee Structure</label>
                <select
                  value={form.fee_structure}
                  onChange={(e) => setForm({ ...form, fee_structure: e.target.value })}
                  className={inputClass}
                >
                  {FEE_STRUCTURES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {FEE_STRUCTURES.find((f) => f.value === form.fee_structure)?.description}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {form.fee_structure === "aum_percentage"
                    ? "Fee %"
                    : form.fee_structure === "subscription"
                    ? "Monthly Amount ($)"
                    : "Flat Fee ($)"}
                </label>
                <input
                  type="number"
                  value={form.fee_amount}
                  step={form.fee_structure === "aum_percentage" ? 0.1 : 100}
                  onChange={(e) =>
                    setForm({ ...form, fee_amount: parseFloat(e.target.value) || 0 })
                  }
                  className={inputClass}
                />
              </div>
              {form.fee_structure === "aum_percentage" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">AUM Value ($)</label>
                  <input
                    type="number"
                    value={form.aum_value}
                    onChange={(e) =>
                      setForm({ ...form, aum_value: parseFloat(e.target.value) || 0 })
                    }
                    className={inputClass}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Estimated annual fee: $
                    {Math.round(form.aum_value * (form.fee_amount / 100)).toLocaleString()}
                  </p>
                </div>
              )}
              {form.fee_structure === "subscription" && (
                <p className="text-[11px] text-gray-400">
                  Annual revenue from this deal: ${(form.fee_amount * 12).toLocaleString()}
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={2}
                  placeholder="e.g. 50% hedge on diesel via USO"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditingDeal(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={editingDeal ? saveEdit : createDeal}
                disabled={!formValid || saving}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingDeal ? "Save Changes" : "Create Deal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-create CTA */}
      {postCreateDealId && postCreateCompanyId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm border border-gray-200 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Deal created</h3>
            <p className="text-sm text-gray-600 mb-4">
              Want to build the hedging implementation plan now? It only takes 2 minutes.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setPostCreateDealId(null);
                  setPostCreateCompanyId(null);
                }}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Later
              </button>
              <button
                onClick={() => {
                  router.push(`/implementation/${postCreateCompanyId}?deal_id=${postCreateDealId}`);
                }}
                className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium inline-flex items-center gap-1.5"
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
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm border border-gray-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete this deal?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmDelete.company_name} —{" "}
              <span className="capitalize">{confirmDelete.fee_structure.replace("_", " ")}</span> · $
              {confirmDelete.annual_fee_revenue.toLocaleString()}/yr.
              <br />
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={deleteDeal}
                disabled={saving}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
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
