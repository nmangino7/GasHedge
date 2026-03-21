"use client";
import { useEffect, useState } from "react";
import { dealsApi, companiesApi } from "@/lib/api";
import type { Deal, RevenueData, Company } from "@/lib/types";
import { DEAL_STAGES, FEE_STRUCTURES } from "@/lib/constants";
import { DollarSign, Users, TrendingUp, PlusCircle } from "lucide-react";

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDeal, setNewDeal] = useState({
    company_id: 0,
    fee_structure: "aum_percentage",
    fee_amount: 1.5,
    aum_value: 25000,
    notes: "",
  });

  useEffect(() => { loadData(); }, []);

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
      if (c.length > 0 && newDeal.company_id === 0) {
        setNewDeal((prev) => ({ ...prev, company_id: c[0].id }));
      }
    } catch {}
    setLoading(false);
  }

  async function createDeal() {
    try {
      await dealsApi.create(newDeal);
      setShowCreate(false);
      loadData();
    } catch {
      alert("Failed to create deal.");
    }
  }

  async function updateDealStatus(dealId: number, status: string) {
    try {
      await dealsApi.update(dealId, { status });
      loadData();
    } catch {}
  }

  const stageColor = (status: string) =>
    DEAL_STAGES.find((s) => s.value === status)?.color || "bg-gray-100 text-gray-700";

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 outline-none";

  if (loading) return <div className="animate-pulse"><div className="h-6 bg-gray-100 rounded w-48 mb-4"></div></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deals & Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">Track advisory deals and revenue</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium"
        >
          <PlusCircle className="h-4 w-4" /> New Deal
        </button>
      </div>

      {revenue && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Annual Revenue", value: `$${revenue.total_annual_revenue.toLocaleString()}`, icon: DollarSign },
            { label: "Monthly Revenue", value: `$${revenue.total_monthly_revenue.toLocaleString()}`, icon: DollarSign },
            { label: "Active Deals", value: revenue.active_deals.toString(), icon: Users },
            { label: "Pipeline Value", value: `$${revenue.pipeline_value.toLocaleString()}`, icon: TrendingUp },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><card.icon className="h-3.5 w-3.5" /> {card.label}</div>
              <p className="text-xl font-semibold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {revenue && Object.keys(revenue.revenue_by_type).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Revenue by Fee Type</h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(revenue.revenue_by_type).map(([type, amount]) => (
              <div key={type} className="text-center p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 capitalize">{type.replace("_", " ")}</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">${amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {revenue && revenue.top_clients.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Top Clients</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Company</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Annual Revenue</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Deals</th>
            </tr></thead>
            <tbody>
              {revenue.top_clients.map((c) => (
                <tr key={c.company_id} className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-900 font-medium">{c.company_name}</td>
                  <td className="py-2 px-3 text-right text-gray-700">${c.annual_revenue.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{c.deal_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">All Deals</h2>
        {deals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No deals yet. Create one to start tracking revenue.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Company</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Fee Type</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Fee</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Annual Revenue</th>
              <th className="text-center py-2 px-3 text-xs text-gray-500 font-medium">Status</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-900 font-medium">{d.company_name}</td>
                  <td className="py-2 px-3 text-gray-700 capitalize">{d.fee_structure.replace("_", " ")}</td>
                  <td className="py-2 px-3 text-right text-gray-700">
                    {d.fee_structure === "aum_percentage" ? `${d.fee_amount}%` : `$${d.fee_amount.toLocaleString()}`}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 font-medium">${d.annual_fee_revenue.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${stageColor(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <select
                      value={d.status}
                      onChange={(e) => updateDealStatus(d.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700"
                    >
                      {DEAL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border border-gray-200 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Create New Deal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                <select value={newDeal.company_id} onChange={(e) => setNewDeal({ ...newDeal, company_id: parseInt(e.target.value) })}
                  className={inputClass}>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fee Structure</label>
                <select value={newDeal.fee_structure} onChange={(e) => setNewDeal({ ...newDeal, fee_structure: e.target.value })}
                  className={inputClass}>
                  {FEE_STRUCTURES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">{FEE_STRUCTURES.find(f => f.value === newDeal.fee_structure)?.description}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {newDeal.fee_structure === "aum_percentage" ? "Fee %" :
                   newDeal.fee_structure === "subscription" ? "Monthly Amount ($)" : "Flat Fee ($)"}
                </label>
                <input type="number" value={newDeal.fee_amount} step={newDeal.fee_structure === "aum_percentage" ? 0.1 : 100}
                  onChange={(e) => setNewDeal({ ...newDeal, fee_amount: parseFloat(e.target.value) || 0 })}
                  className={inputClass} />
              </div>
              {newDeal.fee_structure === "aum_percentage" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">AUM Value ($)</label>
                  <input type="number" value={newDeal.aum_value}
                    onChange={(e) => setNewDeal({ ...newDeal, aum_value: parseFloat(e.target.value) || 0 })}
                    className={inputClass} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={newDeal.notes} onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                  className={`${inputClass} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={createDeal} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium">
                Create Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
