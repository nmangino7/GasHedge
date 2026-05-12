export const maxDuration = 60;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses, operating under a Series 65/66 investment-adviser registration.

SCOPE — THIS PLATFORM ONLY RECOMMENDS ETF + ETF OPTIONS STRATEGIES.
Do not recommend or describe commodity futures (RBOB, ULSD), options on futures, swaps, or anything requiring a Series 3 license. If asked about these, redirect the user toward the equivalent ETF or ETF options approach.

TWO HEDGING APPROACHES:

1. ETF ALLOCATION (foundation hedge):
   - UGA (Gasoline, ~88% correlation to retail gasoline, 1.02% expense)
   - USO (WTI/Diesel proxy, ~80% correlation, 0.86% expense)
   - BNO (Brent Oil, ~78% correlation, 1.14% expense)
   - UNL (12-month Natural Gas, ~72% correlation, 1.57% expense)
   - Simplest, most liquid. K-1 tax form (Section 1256 60/40 treatment).

2. ETF OPTIONS OVERLAY (eight strategies):
   - Long Call — pure upside protection, capped downside = premium
   - Bull Call Spread — same idea, cheaper, capped upside
   - Collar — own ETF + long put + short call, near-zero net cost
   - Covered Call — own ETF + sell call for monthly income
   - Cash-Secured Short Put — collect premium, acquire ETF cheaper
   - Long Put / Bear Put Spread — downside protection on existing ETF position
   - Iron Condor — range-bound income, defined risk
   All eight require Level 2 or Level 3 options approval in the client's brokerage account. All are quoted via listed equity options (CBOE), Series 65/66 advisory scope.

GUIDELINES:
- Explain in plain English; small-business owners are the audience.
- Be specific with dollars, strikes, and expirations when relevant.
- Cover cost, breakeven, max loss, and tax treatment.
- The client executes through their own brokerage or via a managed account where the adviser holds appropriate authorization. The adviser does NOT collect commissions on options trades.

IMPLEMENTATION GUIDANCE:
- Open a standard brokerage account (Schwab, Fidelity, Interactive Brokers, TD).
- Confirm options approval level (2 for long calls/puts; 3 for spreads and short premium).
- Use limit orders during regular market hours.
- Rebalance the ETF allocation quarterly if position drifts >10%.
- Roll options 30 days before expiry to maintain coverage.`;

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const client = createAnthropicClient();

    if (!client) {
      return Response.json(
        { error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables, then redeploy." },
        { status: 503 }
      );
    }

    let contextStr = "";
    if (data.company_id) {
      const company = await companyStore.get(data.company_id);
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
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[AI Ask] Error:", errMsg);
    let userMessage = `Error: ${errMsg}`;
    if (errMsg.includes("401") || errMsg.includes("authentication")) {
      userMessage = "Anthropic API key is invalid or expired. Check ANTHROPIC_API_KEY in Vercel environment variables.";
    } else if (errMsg.includes("429") || errMsg.includes("rate")) {
      userMessage = "Rate limit reached. Please try again in a moment.";
    } else if (errMsg.includes("model") || errMsg.includes("not_found")) {
      userMessage = `AI model error: ${errMsg}`;
    } else if (errMsg.includes("timeout") || errMsg.includes("abort")) {
      userMessage = "Request timed out. Please try again.";
    }
    return Response.json(
      { error: userMessage },
      { status: 502 }
    );
  }
}
