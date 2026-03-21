"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { companiesApi, hedgingApi, aiApi } from "@/lib/api";
import type { Company, ScenarioResult, AIResponse } from "@/lib/types";
import ScenarioChart from "@/components/ScenarioChart";
import ComplianceDisclaimer from "@/components/ComplianceDisclaimer";
import { FileText, Loader2 } from "lucide-react";

export default function ReportsPage() {
  const params = useParams();
  const companyId = Number(params.companyId);
  const [company, setCompany] = useState<Company | null>(null);
  const [hedgeRatio, setHedgeRatio] = useState(0.5);
  const [ticker, setTicker] = useState("UGA");
  const [generating, setGenerating] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [aiNarrative, setAiNarrative] = useState<AIResponse | null>(null);
  const [generated, setGenerated] = useState(false);

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
    try {
      const [scenarioData, aiData] = await Promise.all([
        hedgingApi.scenarios(companyId, hedgeRatio, ticker),
        aiApi.recommend(companyId).catch((err) => ({
          response: `AI analysis error: ${err instanceof Error ? err.message : String(err)}`,
          disclaimers: [],
        })),
      ]);
      setScenarios(scenarioData.scenarios);
      // Check if AI returned an error message from the server
      if (aiData.response && (aiData.response.startsWith("Error:") || aiData.response.startsWith("Claude API key not configured"))) {
        setAiNarrative({
          response: aiData.response,
          disclaimers: aiData.disclaimers || [],
        });
      } else {
        setAiNarrative(aiData);
      }
      setGenerated(true);
    } catch (err) {
      setAiNarrative({
        response: `Unable to generate report: ${err instanceof Error ? err.message : String(err)}`,
        disclaimers: [],
      });
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Generate Report</h1>
      <p className="text-sm text-gray-500 mb-6">
        {company ? `Hedging analysis for ${company.name}` : "Loading..."}
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Hedge Ratio</label>
            <div className="flex gap-2">
              {[
                { value: 0.25, label: "Conservative (25%)" },
                { value: 0.5, label: "Moderate (50%)" },
                { value: 0.75, label: "Aggressive (75%)" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHedgeRatio(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border ${
                    hedgeRatio === opt.value
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">ETF Instrument</label>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:ring-1 focus:ring-gray-400 outline-none"
            >
              <option value="UGA">UGA — US Gasoline Fund (best for gasoline)</option>
              <option value="USO">USO — US Oil Fund (best for diesel)</option>
              <option value="BNO">BNO — US Brent Oil Fund (alternative)</option>
            </select>
          </div>

          <button
            onClick={generateReport}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating Report...</>
            ) : (
              <><FileText className="h-4 w-4" /> Generate Report</>
            )}
          </button>
        </div>
      </div>

      {generated && (
        <div className="space-y-6">
          {/* AI Analysis */}
          {aiNarrative && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">AI Strategy Analysis</h2>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {aiNarrative.response}
              </div>
            </div>
          )}

          {/* Scenario Chart */}
          {scenarios.length > 0 && <ScenarioChart scenarios={scenarios} />}

          {/* Scenario Table */}
          {scenarios.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Cost Comparison</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Price Change</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Unhedged</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Hedged</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.price_change_pct} className="border-b border-gray-50">
                      <td className="py-2 px-3 text-gray-900 font-medium">{s.price_change_pct >= 0 ? "+" : ""}{(s.price_change_pct * 100).toFixed(0)}%</td>
                      <td className="py-2 px-3 text-right text-gray-700">${s.unhedged_annual_cost.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gray-700">${s.hedged_annual_cost.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right font-medium ${s.savings >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {s.savings >= 0 ? "+" : ""}${s.savings.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ComplianceDisclaimer disclaimers={aiNarrative?.disclaimers} />

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">
              This report is generated inline. For a downloadable PDF report, run the backend locally with <code className="bg-gray-100 px-1 rounded">uvicorn app.main:app</code> and use the PDF generation endpoint.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
