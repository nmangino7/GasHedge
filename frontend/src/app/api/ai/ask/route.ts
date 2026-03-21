export const maxDuration = 30;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses.
You provide recommendations using securities-based products (ETFs like UGA, USO, BNO, UNL)
and annuity-based hedging strategies that the advisory firm is licensed to recommend.

IMPORTANT CONSTRAINTS:
- Recommend ETF-based hedging strategies and annuity alternatives (no futures, swaps, or options)
- Include disclaimer that past performance does not guarantee future results
- Explain concepts simply for business owners, not traders
- Focus on business impact: what does this mean for their bottom line
- Always mention the costs: ETF expense ratios, advisory fees, K-1 tax complexity
- Never make specific buy/sell recommendations — frame as analysis and advisory

ANNUITY HEDGING OPTIONS:
- Variable Annuity with Commodity Sub-Accounts: invest in energy/oil sub-accounts within a tax-deferred wrapper. Annual fees ~2.1% (M&E 1.25% + admin 0.15% + sub-account ~0.7%). 7-year surrender period.
- Fixed Indexed Annuity tied to commodity index: returns linked to S&P GSCI Energy Index with principal protection (0% floor). Annual fees ~1.5%. 8-year surrender period.

CRITICAL: AGE 59½ RULE FOR ANNUITIES:
- Withdrawals before age 59½ incur a 10% IRS early withdrawal penalty on GAINS (not principal)
- Business owners CAN still withdraw money even under 59½ — they just pay the penalty
- Most annuities allow 10% free withdrawal per year (no insurer surrender charge, but IRS penalty still applies if under 59½)
- 72(t) / SEPP distributions can avoid the 10% IRS penalty at any age through substantially equal periodic payments
- Full surrender is always possible — owner pays surrender charges + IRS penalty if applicable
- 1035 Exchange allows transfer to a different annuity without tax consequences
- ETFs have NO age restriction — full liquidity anytime, which is a major advantage for younger business owners

When comparing ETFs vs annuities, always mention:
1. ETFs: higher liquidity, lower fees, no age penalties, better fuel correlation, K-1 tax complexity
2. Annuities: tax-deferred growth, potential principal protection (FIA), higher fees, surrender charges, 59½ rule`;

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const client = createAnthropicClient();

    if (!client) {
      return Response.json({
        response:
          "Claude API key not configured. Add ANTHROPIC_API_KEY (or CLAUDE_API_KEY) to your Vercel environment variables, then redeploy.",
        disclaimers: DISCLAIMERS,
      });
    }

    let contextStr = "";
    if (data.company_id) {
      const company = companyStore.get(data.company_id);
      if (company) {
        const gasPrice = await getCurrentPrice("gasoline", company.padd_region);
        const dieselPrice = await getCurrentPrice("diesel", company.padd_region);
        contextStr = `\n\nCOMPANY CONTEXT:\n${JSON.stringify(
          {
            name: company.name,
            company_type: company.company_type,
            fleet_size: company.fleet_size,
            fuel_type: company.fuel_type,
            padd_region: company.padd_region,
            monthly_gallons_gasoline: company.monthly_gallons_gasoline,
            monthly_gallons_diesel: company.monthly_gallons_diesel,
            annual_revenue: company.annual_revenue,
            current_gas_price: gasPrice,
            current_diesel_price: dieselPrice,
          },
          null,
          2
        )}`;
      }
    }

    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Question: ${data.question}${contextStr}` },
      ],
    });
    return Response.json({
      response:
        message.content[0].type === "text" ? message.content[0].text : "",
      disclaimers: DISCLAIMERS,
    });
  } catch (e) {
    console.error("[AI Ask] Error:", e);
    return Response.json({
      response: `Error: ${e instanceof Error ? e.message : String(e)}`,
      disclaimers: DISCLAIMERS,
    });
  }
}
