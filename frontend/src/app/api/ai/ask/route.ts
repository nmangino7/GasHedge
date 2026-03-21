export const maxDuration = 30;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses.
You provide recommendations using securities-based products (ETFs like UGA, USO, BNO, UNL)
that the advisory firm is licensed to recommend under Series 65/6/63 registrations.

IMPORTANT CONSTRAINTS:
- Only recommend ETF-based hedging strategies (no futures, swaps, or options)
- Include disclaimer that past performance does not guarantee future results
- Explain concepts simply for business owners, not traders
- Focus on business impact: what does this mean for their bottom line
- Always mention the costs: ETF expense ratios, advisory fees, K-1 tax complexity
- Never make specific buy/sell recommendations — frame as analysis and advisory`;

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
