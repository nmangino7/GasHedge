export const maxDuration = 60;

import { z } from "zod";
import { NextRequest } from "next/server";
import { runAdvisor, AiNotConfiguredError } from "@/ai/advisor";
import { ok, fail } from "@/api/envelope";

const BodySchema = z.object({
  task: z.enum(["advisor_chat", "deep_report", "market_outlook"]).default("advisor_chat"),
  question: z.string().min(1, "question is required"),
  companyId: z.number().optional(),
  history: z.array(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("VALIDATION", "Request body must be JSON.");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid request.", parsed.error.flatten());
  }

  try {
    const result = await runAdvisor(parsed.data);
    return ok(result);
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return fail("AI_NOT_CONFIGURED", "Anthropic API key not configured. Add ANTHROPIC_API_KEY and redeploy.");
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/429|rate/i.test(msg)) return fail("AI_RATE_LIMIT", "Rate limit reached. Try again shortly.");
    console.error("[AI advisor] Error:", msg);
    return fail("UPSTREAM", `AI request failed: ${msg}`);
  }
}
