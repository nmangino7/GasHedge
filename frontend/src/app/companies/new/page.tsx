"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { companiesApi } from "@/lib/api";
import { COMPANY_TYPES, FUEL_TYPES, US_STATES, INDUSTRY_DEFAULTS } from "@/lib/constants";
import type { CompanyCreate } from "@/lib/types";

export default function NewCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyCreate>({
    name: "",
    company_type: "landscaping",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address_state: "TX",
    fleet_size: 5,
    vehicle_types: "[]",
    fuel_type: "gasoline",
    monthly_gallons_gasoline: 0,
    monthly_gallons_diesel: 0,
    annual_revenue: 0,
  });

  function updateForm(updates: Partial<CompanyCreate>) {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      // Auto-fill defaults when company type changes
      if (updates.company_type && INDUSTRY_DEFAULTS[updates.company_type]) {
        const defaults = INDUSTRY_DEFAULTS[updates.company_type];
        next.fuel_type = defaults.fuel_type;
        const gallons = defaults.gallons_per_unit * (next.fleet_size || 5);
        if (defaults.fuel_type === "gasoline") {
          next.monthly_gallons_gasoline = gallons;
          next.monthly_gallons_diesel = 0;
        } else {
          next.monthly_gallons_diesel = gallons;
          next.monthly_gallons_gasoline = 0;
        }
      }
      return next;
    });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const company = await companiesApi.create(form);
      router.push(`/companies/${company.id}`);
    } catch (err) {
      alert("Failed to create company. Make sure the backend is running.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Add New Company</h1>
      <p className="text-gray-500 mb-8">Onboard a client for fuel hedging advisory</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? "bg-emerald-600 text-white" :
              step > s ? "bg-emerald-100 text-emerald-700" :
              "bg-gray-100 text-gray-400"
            }`}>{s}</div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? "bg-emerald-300" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-3 text-sm text-gray-500">
          {step === 1 ? "Company Info" : step === 2 ? "Fleet Details" : step === 3 ? "Fuel Consumption" : "Review"}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., Smith Landscaping LLC" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
              <select value={form.company_type} onChange={(e) => updateForm({ company_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                {COMPANY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input type="text" value={form.contact_name} onChange={(e) => updateForm({ contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.contact_email} onChange={(e) => updateForm({ contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input type="tel" value={form.contact_phone || ""} onChange={(e) => updateForm({ contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fleet Size (# of vehicles/crews)</label>
              <input type="number" value={form.fleet_size} min={1}
                onChange={(e) => updateForm({ fleet_size: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Fuel Type</label>
              <select value={form.fuel_type} onChange={(e) => updateForm({ fuel_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                {FUEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select value={form.address_state} onChange={(e) => updateForm({ address_state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {(form.fuel_type === "gasoline" || form.fuel_type === "both") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Gasoline (gallons)</label>
                <input type="number" value={form.monthly_gallons_gasoline || 0} min={0}
                  onChange={(e) => updateForm({ monthly_gallons_gasoline: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                {INDUSTRY_DEFAULTS[form.company_type] && (
                  <p className="text-xs text-gray-400 mt-1">
                    Industry avg: ~{INDUSTRY_DEFAULTS[form.company_type].gallons_per_unit} gal/unit/month
                  </p>
                )}
              </div>
            )}
            {(form.fuel_type === "diesel" || form.fuel_type === "both") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Diesel (gallons)</label>
                <input type="number" value={form.monthly_gallons_diesel || 0} min={0}
                  onChange={(e) => updateForm({ monthly_gallons_diesel: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Revenue ($, optional)</label>
              <input type="number" value={form.annual_revenue || 0} min={0}
                onChange={(e) => updateForm({ annual_revenue: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              <p className="text-xs text-gray-400 mt-1">Used to calculate fuel as % of revenue</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Review & Confirm</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-gray-500">Company</div><div className="font-medium">{form.name}</div>
              <div className="text-gray-500">Type</div><div className="font-medium">{COMPANY_TYPES.find(t => t.value === form.company_type)?.label}</div>
              <div className="text-gray-500">Contact</div><div className="font-medium">{form.contact_name} ({form.contact_email})</div>
              <div className="text-gray-500">State</div><div className="font-medium">{form.address_state}</div>
              <div className="text-gray-500">Fleet Size</div><div className="font-medium">{form.fleet_size}</div>
              <div className="text-gray-500">Fuel Type</div><div className="font-medium">{form.fuel_type}</div>
              {form.monthly_gallons_gasoline ? (
                <><div className="text-gray-500">Monthly Gas</div><div className="font-medium">{form.monthly_gallons_gasoline.toLocaleString()} gal</div></>
              ) : null}
              {form.monthly_gallons_diesel ? (
                <><div className="text-gray-500">Monthly Diesel</div><div className="font-medium">{form.monthly_gallons_diesel.toLocaleString()} gal</div></>
              ) : null}
              {form.annual_revenue ? (
                <><div className="text-gray-500">Annual Revenue</div><div className="font-medium">${form.annual_revenue.toLocaleString()}</div></>
              ) : null}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Back
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Company"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
