export const maxDuration = 60;

import { legacyAdvisorJson } from "@/ai/legacy-response";

const QUESTION = `Write a comprehensive written fuel-hedging advisory report for this company. Use your tools to ground every number. Include these sections:
- Executive summary
- Fuel-cost exposure (monthly/annual cost, % of revenue, price-shock scenarios)
- Recommended ETF allocation (instrument, coverage, shares, notional, annual cost) and WHY, including the minimum-variance hedge ratio and the basis risk that remains
- ETF options overlay options (compare a few structures with premium, max loss, breakeven)
- Scenario analysis (hedged vs unhedged across fuel moves)
- Step-by-step implementation
- Risks and ongoing monitoring`;

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
