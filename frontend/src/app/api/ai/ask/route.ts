export const maxDuration = 60;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses.
You provide recommendations covering all hedging approaches: ETFs, options, and futures.

THREE HEDGING APPROACHES:

1. ETF-BASED (Series 65/66):
   - UGA (Gasoline, 88% correlation, 0.97% expense)
   - USO (Oil/Diesel, 80% correlation, 0.81% expense)
   - BNO (Brent Oil, 78% correlation, 0.90% expense)
   - Simplest, most liquid, K-1 tax forms

2. OPTIONS (Series 3 required):
   - Call options on RBOB/ULSD futures, ~5-8% premium
   - Max loss = premium paid, 90-95% correlation
   - Cheaper than ETFs for larger hedges

3. FUTURES (Series 3 required):
   - RBOB gasoline / ULSD diesel, 42,000 gal/contract
   - 92-95% correlation, margin-based, no expense ratio
   - Strongest hedge but highest complexity

SERIES 3 LICENSE: ~80 hours study, $140 exam, opens options & futures.

GUIDELINES:
- Explain simply for business owners
- Be specific with numbers and dollar amounts
- Cover costs, tax implications, and implementation
- Note which licenses each approach requires

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
