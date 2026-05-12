"use client";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Key, ExternalLink, Settings as SettingsIcon } from "lucide-react";

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
    void loadStatus();
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
    if (result === "success") return <CheckCircle2 className="h-5 w-5" style={{ color: "var(--positive)" }} />;
    if (result === "error") return <AlertCircle className="h-5 w-5" style={{ color: "var(--warning)" }} />;
    if (result === "not_configured") return <XCircle className="h-5 w-5" style={{ color: "var(--negative)" }} />;
    return <Loader2 className="h-5 w-5 text-[color:var(--muted-2)] animate-spin" />;
  };

  const statusTint = (result: string): string => {
    if (result === "success") return "var(--positive-tint)";
    if (result === "error") return "var(--warning-tint)";
    if (result === "not_configured") return "var(--negative-tint)";
    return "var(--bg)";
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-7">
        <div>
          <span className="h-section">Configuration</span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
            <SettingsIcon className="h-7 w-7 text-[color:var(--accent)]" />
            Settings
          </h1>
          <p className="text-sm text-[color:var(--muted)] mt-1.5">
            API connections, environment variables, and integration health
          </p>
        </div>
        <button onClick={loadStatus} disabled={loading} className="btn btn-ghost">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div
          className="surface p-4 mb-5"
          style={{ borderColor: "var(--negative-tint)", background: "var(--negative-tint)", color: "var(--negative)" }}
        >
          <p className="text-sm font-semibold">Failed to load status</p>
          <p className="text-xs mt-1 text-[color:var(--muted)]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-[color:var(--muted-2)] animate-spin mb-3" />
          <p className="text-sm text-[color:var(--muted)]">Checking API connections...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.envVar}
              className="surface p-5"
              style={{ background: statusTint(key.testResult) }}
            >
              <div className="flex items-start gap-4">
                {statusIcon(key.testResult)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[14px] font-semibold text-[color:var(--ink)]">{key.name}</h3>
                    <span className={`pill ${key.configured ? "pill-positive" : "pill-negative"}`}>
                      {key.configured ? "Connected" : "Not Connected"}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-[12px]">
                      <Key className="h-3 w-3 text-[color:var(--muted-2)] shrink-0" />
                      <span className="text-[color:var(--muted)]">Env Variable</span>
                      <code className="bg-[color:var(--bg-elev)] border border-[color:var(--line)] px-1.5 py-0.5 rounded font-mono text-[11px] text-[color:var(--ink-2)]">
                        {key.envVar}
                      </code>
                    </div>

                    {key.maskedValue && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[color:var(--muted)] ml-5">Value</span>
                        <code className="bg-[color:var(--bg-elev)] border border-[color:var(--line)] px-1.5 py-0.5 rounded font-mono text-[11px] text-[color:var(--ink-2)]">
                          {key.maskedValue}
                        </code>
                      </div>
                    )}

                    <p
                      className="text-[12px] mt-1 ml-5"
                      style={{
                        color:
                          key.testResult === "success"
                            ? "var(--positive)"
                            : key.testResult === "error"
                            ? "var(--warning)"
                            : "var(--negative)",
                      }}
                    >
                      {key.testMessage}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="surface p-5 mt-6">
            <h3 className="h-section mb-3">How to Add API Keys</h3>
            <ol className="space-y-2.5 text-[13px] text-[color:var(--ink-2)]">
              {[
                <>Go to your <strong>Vercel Dashboard</strong> → Project → Settings → Environment Variables</>,
                <>Add the variable name (e.g. <code className="bg-[color:var(--bg)] border border-[color:var(--line)] px-1 rounded text-[11px] font-mono">EIA_API_KEY</code>) and paste your key</>,
                <>Make sure it&apos;s enabled for <strong>Production</strong>, Preview, and Development</>,
                <><strong>Redeploy</strong> your project — env vars take effect only after a new deployment</>,
              ].map((text, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: "var(--accent-tint)", color: "var(--accent-lo)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{text}</span>
                </li>
              ))}
            </ol>

            <div className="hr my-4" />
            <h4 className="h-section mb-3">Get Free API Keys</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { href: "https://www.eia.gov/opendata/register.php", label: "EIA — Fuel Prices" },
                { href: "https://console.anthropic.com/settings/keys", label: "Anthropic — AI" },
                { href: "https://www.alphavantage.co/support/#api-key", label: "Alpha Vantage — ETF" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold border border-[color:var(--line)] hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)] transition-colors text-[color:var(--ink-2)]"
                >
                  <ExternalLink className="h-3 w-3 text-[color:var(--accent)]" />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
