export const maxDuration = 30;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import {
  calculateExposure,
  recommendStrategy,
  DEFAULT_ETF_PRICES,
} from "@/lib/hedging-engine";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses.
You provide actionable ETF-based hedging recommendations that the advisory firm is licensed to recommend.

IMPORTANT CONSTRAINTS:
- ONLY recommend ETF-based hedging strategies using UGA, USO, BNO, or UNL (no futures, swaps, options, or annuities)
- Include disclaimer that past performance does not guarantee future results
- Explain concepts simply for business owners, not traders
- Focus on business impact: what does this mean for their bottom line
- Always mention the costs: ETF expense ratios, advisory fees, K-1 tax complexity
- Frame as analysis and advisory guidance
- Be specific: mention exact share counts, dollar amounts, and breakeven prices
- Include step-by-step implementation advice

ETF PRODUCTS:
- UGA (US Gasoline Fund): 88% correlation to retail gasoline, 0.97% expense ratio
- USO (US Oil Fund): 80% correlation to retail diesel, 0.81% expense ratio
- BNO (US Brent Oil Fund): 78% correlation, 0.90% expense ratio

IMPLEMENTATION STEPS TO COVER:
1. Which brokerage to use (Schwab, Fidelity, IBKR)
2. Exact capital needed and shares to purchase
3. Order type (limit order during market hours)
4. Monitoring plan (weekly price tracking)
5. Rebalancing schedule (quarterly, if >10% drift)
6. Tax implications (K-1 form, 60/40 capital gains)
7. Exit strategy (when to sell, settlement T+1)`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = companyStore.get(Number(companyId));
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

STRATEGY OPTIONS: ${JSON.stringify(strategies, null, 2)}

Please provide a detailed, actionable recommendation:
1. Which strategy tier is best for this specific company and why
2. Exactly how the hedge works in plain language (buy X shares of Y ETF)
3. The breakeven point — at what fuel price does the hedge start saving money
4. Step-by-step implementation: which broker, how to fund, how to place the trade
5. Key risks and all-in costs (expense ratio + advisory fees)
6. What happens in 3 scenarios: prices rise 20%, stay flat, drop 20%
7. Monitoring and rebalancing plan`,
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
