import { getAnthropicApiKey } from "@/lib/ai-client";

interface ApiKeyStatus {
  name: string;
  envVar: string;
  configured: boolean;
  maskedValue: string | null;
  testResult: "success" | "error" | "not_configured" | "pending";
  testMessage: string;
}

export async function GET() {
  const keys: ApiKeyStatus[] = [];

  // EIA API Key
  const eiaKey = process.env.EIA_API_KEY || "";
  const eiaConfigured = !!eiaKey && eiaKey !== "your_eia_api_key_here";
  let eiaTest: "success" | "error" | "not_configured" = "not_configured";
  let eiaMessage = "Not configured";
  if (eiaConfigured) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${eiaKey}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&facets[product][]=EPM0&start=2026-01-01&end=2026-12-31&length=1`,
        { cache: "no-store", signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const rows = data?.response?.data || [];
        eiaTest = rows.length > 0 ? "success" : "error";
        eiaMessage = rows.length > 0
          ? `Connected — ${rows.length} data point(s) returned`
          : "Key accepted but no data returned (may be a date range issue)";
      } else {
        eiaTest = "error";
        eiaMessage = `API returned ${res.status}: ${res.statusText}`;
      }
    } catch (e) {
      eiaTest = "error";
      eiaMessage = `Connection failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  keys.push({
    name: "EIA (Energy Information Administration)",
    envVar: "EIA_API_KEY",
    configured: eiaConfigured,
    maskedValue: eiaConfigured ? maskKey(eiaKey) : null,
    testResult: eiaTest,
    testMessage: eiaMessage,
  });

  // Anthropic / Claude API Key
  const anthropicKey = getAnthropicApiKey();
  const anthropicConfigured = !!anthropicKey;
  let anthropicEnvName = "ANTHROPIC_API_KEY";
  if (!process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_API_KEY) anthropicEnvName = "CLAUDE_API_KEY";
  if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY && process.env.CLAUDE_KEY) anthropicEnvName = "CLAUDE_KEY";

  keys.push({
    name: "Claude AI (Anthropic)",
    envVar: anthropicEnvName,
    configured: anthropicConfigured,
    maskedValue: anthropicConfigured ? maskKey(anthropicKey!) : null,
    testResult: anthropicConfigured ? "success" : "not_configured",
    testMessage: anthropicConfigured
      ? `Key found via ${anthropicEnvName}`
      : "Not configured. Add ANTHROPIC_API_KEY to Vercel env vars.",
  });

  // Alpha Vantage
  const avKey = process.env.APLAG_1 || "";
  const avConfigured = !!avKey;
  keys.push({
    name: "Alpha Vantage (ETF Prices)",
    envVar: "APLAG_1",
    configured: avConfigured,
    maskedValue: avConfigured ? maskKey(avKey) : null,
    testResult: avConfigured ? "success" : "not_configured",
    testMessage: avConfigured
      ? "Key configured"
      : "Not configured. Add APLAG_1 to Vercel env vars.",
  });

  return Response.json({ keys });
}

function maskKey(key: string): string {
  if (key.length <= 8) return key.slice(0, 2) + "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}
