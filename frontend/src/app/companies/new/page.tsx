"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { companiesApi } from "@/lib/api";
import { COMPANY_TYPES, FUEL_TYPES, US_STATES, INDUSTRY_DEFAULTS } from "@/lib/constants";
import type { CompanyCreate } from "@/lib/types";
import { Upload, X } from "lucide-react";

export default function NewCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CompanyCreate & { notes?: string; territory?: string; seasonal_notes?: string }>({
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
    notes: "",
    territory: "",
    seasonal_notes: "",
  });

  function updateForm(updates: Partial<typeof form>) {
    setForm((prev) => {
      const next = { ...prev, ...updates };
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const newFiles = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      // Combine notes with territory and seasonal info
      let fullNotes = form.notes || "";
      if (form.territory) fullNotes += `\n\nOperating Territory: ${form.territory}`;
      if (form.seasonal_notes) fullNotes += `\n\nSeasonal Patterns: ${form.seasonal_notes}`;
      if (uploadedFiles.length > 0) {
        fullNotes += `\n\nUploaded Documents: ${uploadedFiles.map((f) => f.name).join(", ")}`;
      }

      const company = await companiesApi.create({
        ...form,
        notes: fullNotes.trim() || undefined,
      });
      router.push(`/companies/${company.id}`);
    } catch {
      alert("Failed to create company.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Add New Company</h1>
      <p className="text-sm text-gray-500 mb-6">Onboard a client for fuel hedging advisory</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              step === s ? "bg-gray-900 text-white" :
              step > s ? "bg-gray-200 text-gray-600" :
              "bg-gray-100 text-gray-400"
            }`}>{s}</div>
            {s < 5 && <div className={`w-8 h-0.5 ${step > s ? "bg-gray-300" : "bg-gray-100"}`} />}
          </div>
        ))}
        <span className="ml-2 text-xs text-gray-500">
          {step === 1 ? "Company Info" : step === 2 ? "Fleet Details" : step === 3 ? "Fuel Consumption" : step === 4 ? "Notes & Documents" : "Review"}
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Company Name</label>
              <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })}
                className={inputClass} placeholder="e.g., Smith Landscaping LLC" />
            </div>
            <div>
              <label className={labelClass}>Company Type</label>
              <select value={form.company_type} onChange={(e) => updateForm({ company_type: e.target.value })}
                className={inputClass}>
                {COMPANY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Contact Name</label>
                <input type="text" value={form.contact_name} onChange={(e) => updateForm({ contact_name: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.contact_email} onChange={(e) => updateForm({ contact_email: e.target.value })}
                  className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone (optional)</label>
              <input type="tel" value={form.contact_phone || ""} onChange={(e) => updateForm({ contact_phone: e.target.value })}
                className={inputClass} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Fleet Size (vehicles/crews)</label>
              <input type="number" value={form.fleet_size} min={1}
                onChange={(e) => updateForm({ fleet_size: parseInt(e.target.value) || 1 })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Primary Fuel Type</label>
              <select value={form.fuel_type} onChange={(e) => updateForm({ fuel_type: e.target.value })}
                className={inputClass}>
                {FUEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select value={form.address_state} onChange={(e) => updateForm({ address_state: e.target.value })}
                className={inputClass}>
                {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Operating Territory / Routes</label>
              <input type="text" value={form.territory || ""} onChange={(e) => updateForm({ territory: e.target.value })}
                className={inputClass} placeholder="e.g., Austin metro area, I-35 corridor" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {(form.fuel_type === "gasoline" || form.fuel_type === "both") && (
              <div>
                <label className={labelClass}>Monthly Gasoline (gallons)</label>
                <input type="number" value={form.monthly_gallons_gasoline || 0} min={0}
                  onChange={(e) => updateForm({ monthly_gallons_gasoline: parseFloat(e.target.value) || 0 })}
                  className={inputClass} />
                {INDUSTRY_DEFAULTS[form.company_type] && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Industry avg: ~{INDUSTRY_DEFAULTS[form.company_type].gallons_per_unit} gal/unit/month
                  </p>
                )}
              </div>
            )}
            {(form.fuel_type === "diesel" || form.fuel_type === "both") && (
              <div>
                <label className={labelClass}>Monthly Diesel (gallons)</label>
                <input type="number" value={form.monthly_gallons_diesel || 0} min={0}
                  onChange={(e) => updateForm({ monthly_gallons_diesel: parseFloat(e.target.value) || 0 })}
                  className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}>Annual Revenue ($, optional)</label>
              <input type="number" value={form.annual_revenue || 0} min={0}
                onChange={(e) => updateForm({ annual_revenue: parseFloat(e.target.value) || 0 })}
                className={inputClass} />
              <p className="text-[11px] text-gray-400 mt-1">Used to calculate fuel as % of revenue</p>
            </div>
            <div>
              <label className={labelClass}>Seasonal Fuel Patterns</label>
              <input type="text" value={form.seasonal_notes || ""} onChange={(e) => updateForm({ seasonal_notes: e.target.value })}
                className={inputClass} placeholder="e.g., Usage doubles in summer, slow Nov–Feb" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Company Issues / Pain Points</label>
              <textarea value={form.notes || ""} onChange={(e) => updateForm({ notes: e.target.value })}
                className={`${inputClass} resize-none`} rows={5}
                placeholder="Describe fuel-related challenges, budget concerns, previous experiences with fuel cost spikes, goals for hedging..." />
              <p className="text-[11px] text-gray-400 mt-1">This helps Claude AI generate better strategy recommendations</p>
            </div>
            <div>
              <label className={labelClass}>Upload Documents</label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-gray-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Drop files here or click to upload</p>
                <p className="text-[11px] text-gray-400 mt-1">Fuel bills, contracts, invoices, fleet data</p>
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg" />
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-md text-xs">
                      <span className="text-gray-700">{f.name} <span className="text-gray-400">({f.size})</span></span>
                      <button onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Review & Confirm</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Company</div><div className="text-gray-900 font-medium">{form.name}</div>
              <div className="text-gray-500">Type</div><div className="text-gray-900">{COMPANY_TYPES.find(t => t.value === form.company_type)?.label}</div>
              <div className="text-gray-500">Contact</div><div className="text-gray-900">{form.contact_name} ({form.contact_email})</div>
              <div className="text-gray-500">State</div><div className="text-gray-900">{form.address_state}</div>
              <div className="text-gray-500">Fleet Size</div><div className="text-gray-900">{form.fleet_size}</div>
              <div className="text-gray-500">Fuel Type</div><div className="text-gray-900 capitalize">{form.fuel_type}</div>
              {form.monthly_gallons_gasoline ? (
                <><div className="text-gray-500">Monthly Gas</div><div className="text-gray-900">{form.monthly_gallons_gasoline.toLocaleString()} gal</div></>
              ) : null}
              {form.monthly_gallons_diesel ? (
                <><div className="text-gray-500">Monthly Diesel</div><div className="text-gray-900">{form.monthly_gallons_diesel.toLocaleString()} gal</div></>
              ) : null}
              {form.annual_revenue ? (
                <><div className="text-gray-500">Annual Revenue</div><div className="text-gray-900">${form.annual_revenue.toLocaleString()}</div></>
              ) : null}
              {form.notes && (
                <><div className="text-gray-500">Notes</div><div className="text-gray-900 text-xs">{form.notes.slice(0, 100)}{form.notes.length > 100 ? "..." : ""}</div></>
              )}
              {uploadedFiles.length > 0 && (
                <><div className="text-gray-500">Documents</div><div className="text-gray-900">{uploadedFiles.length} file(s)</div></>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-30"
          >
            Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Company"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
