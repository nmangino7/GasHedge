export const maxDuration = 60;

import { NextRequest } from "next/server";
import { legacyAdvisorJson } from "@/ai/legacy-response";

export async function POST(req: NextRequest) {
  let data: { question?: string; company_id?: number };
  try {
    data = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  if (!data.question || typeof data.question !== "string") {
    return Response.json({ error: "A 'question' is required." }, { status: 400 });
  }
  return legacyAdvisorJson({
    task: "advisor_chat",
    question: data.question,
    companyId: typeof data.company_id === "number" ? data.company_id : undefined,
  });
}
