export const maxDuration = 30;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses.
You provide recommendations using ETF-based hedging strategies (UGA, USO, BNO, UNL) that the advisory firm is licensed to recommend.

IMPORTANT CONSTRAINTS:
- ONLY recommend ETF-based hedging strategies (no futures, swaps, options, or annuities)
- Include disclaimer that past performance does not guarantee future results
- Explain concepts simply for business owners, not traders
- Focus on business impact: what does this mean for their bottom line
- Always mention the costs: ETF expense ratios (~0.8-1.0%), advisory fees, K-1 tax complexity
- Never make specific buy/sell recommendations — frame as analysis and advisory
- Be specific and actionable: mention exact tickers, approximate share counts, and dollar amounts

ETF HEDGING PRODUCTS:
- UGA (US Gasoline Fund): Best correlation to retail gasoline prices (~88%), expense ratio 0.97%
- USO (US Oil Fund): Best for diesel hedging (~80% correlation), expense ratio 0.81%
- BNO (US Brent Oil Fund): Alternative crude benchmark, expense ratio 0.90%
- UNL (US 12 Month Natural Gas Fund): For natural gas exposure, expense ratio 0.90%

HOW ETF HEDGING WORKS:
1. Buy shares of a fuel-correlated ETF proportional to fuel consumption
2. When fuel prices rise, ETF value rises, offsetting higher fuel costs
3. When fuel prices fall, ETF value falls, but fuel costs are also lower
4. Net effect: more predictable fuel costs with a small insurance premium (expense ratio)

TAX CONSIDERATIONS:
- These ETFs issue Schedule K-1 (not 1099) — requires tax professional
- Gains taxed at blended 60% long-term / 40% short-term rate regardless of holding period
- K-1 forms arrive March-April, may delay tax filing

IMPLEMENTATION GUIDANCE:
- Open standard brokerage account (Schwab, Fidelity, Interactive Brokers)
- Use limit orders during market hours (9:30 AM - 4:00 PM ET)
- Rebalance quarterly if position drifts >10% from target
- Monitor ETF-to-fuel correlation weekly`;

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
