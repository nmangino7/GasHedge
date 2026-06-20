export const maxDuration = 60;

import { legacyAdvisorJson } from "@/ai/legacy-response";

const QUESTION = `Provide a detailed, actionable fuel-hedging recommendation for this company. Use your tools to ground every figure, then cover:
1. The right ETF coverage tier (conservative 25% / moderate 50% / aggressive 75%) and why it fits this company.
2. ONE ETF options structure that best matches the client's risk profile (e.g. collar for risk-averse, bull call spread for cost-sensitive, long call for max protection).
3. Exact mechanics: shares of the ETF, strikes, expirations, contract counts, total premium.
4. Breakeven analysis: at what fuel price does the hedge start saving money?
5. Step-by-step implementation: brokerage, account funding, options-approval level, order entry.
6. Three scenarios — fuel +20%, flat, -20% — what the client pays in each.
7. Monitoring and rebalancing plan (when to roll options, when to rebalance the ETF).`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  return legacyAdvisorJson({
    task: "deep_report",
    question: QUESTION,
    companyId: Number(companyId),
  });
}
