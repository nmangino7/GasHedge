"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { companiesApi, reportsApi } from "@/lib/api";
import type { Company } from "@/lib/types";
import { FileText, Download, Loader2 } from "lucide-react";

export default function ReportsPage() {
  const params = useParams();
  const companyId = Number(params.companyId);
  const [company, setCompany] = useState<Company | null>(null);
  const [hedgeRatio, setHedgeRatio] = useState(0.5);
  const [ticker, setTicker] = useState("UGA");
  const [generating, setGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    companiesApi.get(companyId).then(setCompany).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (company) {
      if (company.fuel_type === "diesel") setTicker("USO");
      else setTicker("UGA");
    }
  }, [company]);

  async function generateReport() {
    setGenerating(true);
    setError(null);
    setReportUrl(null);
    try {
      const result = await reportsApi.generate(companyId, {
        hedge_ratio: hedgeRatio,
        product_ticker: ticker,
      });
      setReportUrl(reportsApi.downloadUrl(result.filename));
    } catch (e: unknown) {
      setError("Failed to generate report. Make sure the backend is running.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Generate Report</h1>
      <p className="text-gray-500 mb-8">
        {company ? `Professional hedging report for ${company.name}` : "Loading..."}
      </p>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hedge Ratio</label>
            <div className="flex gap-3">
              {[
                { value: 0.25, label: "Conservative (25%)" },
                { value: 0.5, label: "Moderate (50%)" },
                { value: 0.75, label: "Aggressive (75%)" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHedgeRatio(opt.value)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border ${
                    hedgeRatio === opt.value
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ETF Instrument</label>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="UGA">UGA — US Gasoline Fund (best for gasoline)</option>
              <option value="USO">USO — US Oil Fund (best for diesel)</option>
              <option value="BNO">BNO — US Brent Oil Fund (alternative)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-4">
              The report includes: executive summary, fuel exposure analysis, industry benchmarks,
              recommended strategy, scenario analysis, historical backtest, cost-benefit summary,
              and required disclaimers. AI-generated narratives require a Claude API key.
            </p>
            <button
              onClick={generateReport}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Report (this may take a moment)...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Generate PDF Report
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {reportUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-700 mb-3">Report generated successfully!</p>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium w-fit"
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
