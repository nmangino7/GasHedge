import { runAdvisor, AdvisorRequest, AiNotConfiguredError } from "./advisor";

/**
 * Run the tool-using advisor and map the result to the legacy
 * `{ response, disclaimers }` JSON shape the existing pages expect, with the
 * legacy HTTP error codes (503 not-configured, 502 upstream).
 */
export async function legacyAdvisorJson(req: AdvisorRequest): Promise<Response> {
  try {
    const result = await runAdvisor(req);
    return Response.json({
      response: result.text,
      disclaimers: result.disclaimers,
      tool_calls: result.toolCalls,
    });
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return Response.json(
        { error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables, then redeploy." },
        { status: 503 }
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[AI] Error:", msg);
    let userMessage = `Error generating AI analysis: ${msg}`;
    if (/401|authentication/i.test(msg)) userMessage = "Anthropic API key is invalid or expired. Check ANTHROPIC_API_KEY in Vercel environment variables.";
    else if (/429|rate/i.test(msg)) userMessage = "Anthropic API rate limit reached. Please try again in a moment.";
    else if (/timeout|abort|ECONNREFUSED/i.test(msg)) userMessage = "AI request timed out. The Anthropic API may be temporarily unavailable.";
    return Response.json({ error: userMessage }, { status: 502 });
  }
}
