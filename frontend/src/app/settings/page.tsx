"use client";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Key, ExternalLink } from "lucide-react";

interface ApiKeyStatus {
  name: string;
  envVar: string;
  configured: boolean;
  maskedValue: string | null;
  testResult: "success" | "error" | "not_configured" | "pending";
  testMessage: string;
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys(data.keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const statusIcon = (result: string) => {
    if (result === "success") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (result === "error") return <AlertCircle className="h-5 w-5 text-amber-500" />;
    if (result === "not_configured") return <XCircle className="h-5 w-5 text-red-400" />;
    return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
  };

  const statusBg = (result: string) => {
    if (result === "success") return "border-green-200 bg-green-50/50";
    if (result === "error") return "border-amber-200 bg-amber-50/50";
    if (result === "not_configured") return "border-red-200 bg-red-50/30";
    return "border-gray-200";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">API connections and configuration</p>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to load status: {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Checking API connections...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <div
              key={key.envVar}
              className={`bg-white rounded-lg border p-5 ${statusBg(key.testResult)}`}
            >
              <div className="flex items-start gap-4">
                {statusIcon(key.testResult)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{key.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      key.configured
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {key.configured ? "Connected" : "Not Connected"}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Key className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="text-gray-500">Env Variable:</span>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-[11px]">
                        {key.envVar}
                      </code>
                    </div>

                    {key.maskedValue && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 ml-5">Value:</span>
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-[11px]">
                          {key.maskedValue}
                        </code>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-xs mt-1">
                      <span className={`ml-5 ${
                        key.testResult === "success" ? "text-green-600" :
                        key.testResult === "error" ? "text-amber-600" :
                        "text-red-500"
                      }`}>
                        {key.testMessage}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Instructions */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">How to Add API Keys</h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-medium text-gray-400 shrink-0">1.</span>
                <span>Go to your <strong>Vercel Dashboard</strong> → Project → Settings → Environment Variables</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-gray-400 shrink-0">2.</span>
                <span>Add the variable name (e.g. <code className="bg-gray-100 px-1 rounded text-xs">EIA_API_KEY</code>) and paste your key</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-gray-400 shrink-0">3.</span>
                <span>Make sure it&apos;s enabled for <strong>Production</strong>, Preview, and Development</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-gray-400 shrink-0">4.</span>
                <span><strong>Redeploy</strong> your project (env vars only take effect after a new deployment)</span>
              </li>
            </ol>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Get API Keys</h4>
              <a href="https://www.eia.gov/opendata/register.php" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
                <ExternalLink className="h-3 w-3" /> EIA API Key (free)
              </a>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
                <ExternalLink className="h-3 w-3" /> Anthropic / Claude API Key
              </a>
              <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
                <ExternalLink className="h-3 w-3" /> Alpha Vantage API Key (free)
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
