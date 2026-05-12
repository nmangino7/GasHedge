export const maxDuration = 60;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import {
  calculateExposure,
  recommendStrategy,
  recommendEtfOptionsStrategies,
  DEFAULT_ETF_PRICES,
} from "@/lib/hedging-engine";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses, operating under a Series 65/66 investment-adviser registration.

SCOPE — THIS PLATFORM ONLY RECOMMENDS ETF + ETF OPTIONS STRATEGIES.
Do not describe or recommend commodity futures (RBOB, ULSD), options on futures, swaps, or any product requiring a Series 3 license.

TWO HEDGING APPROACHES (Series 65/66 advisory):

1. ETF ALLOCATION (foundation hedge):
   - UGA (Gasoline): ~88% correlation to retail gasoline, 1.02% expense
   - USO (WTI / Diesel proxy): ~80% correlation, 0.86% expense
   - BNO (Brent Oil): ~78% correlation, 1.14% expense
   - UNL (Natural Gas, 12-month): ~72% correlation, 1.57% expense
   - K-1 tax form (Section 1256, 60/40 LTCG/STCG)

2. ETF OPTIONS OVERLAY (eight strategies, all listed equity options):
   - Long Call — pure upside protection, capped downside = premium
   - Bull Call Spread — same idea, lower premium, capped upside
   - Collar — own ETF + long put + short call, near-zero net cost
   - Covered Call — own ETF + sell call for monthly income
   - Cash-Secured Short Put — collect premium, build ETF position
   - Long Put / Bear Put Spread — downside protection on existing ETF holdings
   - Iron Condor — range-bound income, defined risk
   All require Level 2 or Level 3 options approval in the client's brokerage.

GUIDELINES:
- Be specific with dollar amounts, share counts, strikes, expirations, breakeven prices.
- Explain in plain English for small-business owners.
- Cover cost, breakeven, max loss, and tax treatment.
- Mention that the adviser does not collect commissions on options trades — only the disclosed advisory fee applies.
- Past performance does not guarantee future results.`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company)
      return Response.json({ detail: "Company not found" }, { status: 404 });

    const client = createAnthropicClient();
    if (!client) {
      return Response.json(
        { error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables, then redeploy." },
        { status: 503 }
      );
    }

    const fuelType =
      company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons =
      fuelType === "diesel"
        ? company.monthly_gallons_diesel || 0
        : company.monthly_gallons_gasoline || 0;

    const gasPrice = await getCurrentPrice("gasoline", company.padd_region);
    const dieselPrice = await getCurrentPrice("diesel", company.padd_region);
    const fuelPrice = fuelType === "gasoline" ? gasPrice : dieselPrice;

    const exposure = calculateExposure(
      company.monthly_gallons_gasoline || 0,
      company.monthly_gallons_diesel || 0,
      gasPrice,
      dieselPrice,
      company.annual_revenue
    );

    const strategies = recommendStrategy(
      fuelType,
      monthlyGallons,
      fuelPrice,
      DEFAULT_ETF_PRICES
    );
    const optionsStrategies = recommendEtfOptionsStrategies(
      monthlyGallons,
      fuelType,
      fuelPrice,
      DEFAULT_ETF_PRICES
    );

    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please provide a hedging recommendation for this company:

COMPANY PROFILE:
- Name: ${company.name}
- Type: ${company.company_type}
- Fleet Size: ${company.fleet_size} vehicles
- Fuel Type: ${company.fuel_type}
- Region: ${company.padd_region}

FUEL EXPOSURE:
- Monthly Fuel Cost: $${exposure.monthly_fuel_cost.toLocaleString()}
- Annual Fuel Cost: $${exposure.annual_fuel_cost.toLocaleString()}
- Fuel as % of Revenue: ${exposure.fuel_pct_revenue || "N/A"}%

ETF ALLOCATION TIERS (foundation hedge): ${JSON.stringify(strategies, null, 2)}

ETF OPTIONS STRATEGIES (overlay or standalone): ${JSON.stringify(
  optionsStrategies.map((s) => ({
    strategy: s.strategy_key,
    name: s.display_name,
    ticker: s.ticker,
    expiry_days: s.expiry_days,
    contracts: s.contracts,
    premium: s.total_premium_label,
    max_loss: s.max_loss,
    max_gain: s.max_gain,
    breakeven: s.breakeven_etf_price,
    best_for: s.best_for,
  })),
  null,
  2
)}

Please provide a detailed, actionable recommendation:
1. Pick the right ETF allocation tier (conservative / moderate / aggressive) and explain why for this company.
2. Pick ONE ETF options structure that best fits the client's risk profile (e.g., collar for risk-averse, bull call spread for cost-sensitive, long call for max-protection).
3. State the exact mechanics: shares of ETF, strikes, expirations, contract counts, total premium.
4. Breakeven analysis — at what fuel price level does the hedge start saving money?
5. Step-by-step implementation: brokerage to use, account funding, options approval level needed, order entry.
6. Three scenarios: fuel +20%, flat, -20% — what does the client pay in each?
7. Monitoring and rebalancing plan (when to roll options, when to rebalance ETF).

Do NOT mention commodity futures, options on futures, or Series 3 strategies. The adviser holds Series 65/66 only.`,
        },
      ],
    });
    return Response.json({
      response:
        message.content[0].type === "text" ? message.content[0].text : "",
      disclaimers: DISCLAIMERS,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[AI Recommend] Error:", errMsg);
    let userMessage = `Error generating AI analysis: ${errMsg}`;
    if (errMsg.includes("401") || errMsg.includes("authentication")) {
      userMessage = "Anthropic API key is invalid or expired. Check ANTHROPIC_API_KEY in Vercel environment variables.";
    } else if (errMsg.includes("429") || errMsg.includes("rate")) {
      userMessage = "Anthropic API rate limit reached. Please try again in a moment.";
    } else if (errMsg.includes("model") || errMsg.includes("not_found")) {
      userMessage = `AI model error: ${errMsg}. The configured model may not be available for your API key.`;
    } else if (errMsg.includes("timeout") || errMsg.includes("abort") || errMsg.includes("ECONNREFUSED")) {
      userMessage = "AI request timed out. The Anthropic API may be temporarily unavailable.";
    }
    return Response.json(
      { error: userMessage },
      { status: 502 }
    );
  }
}
