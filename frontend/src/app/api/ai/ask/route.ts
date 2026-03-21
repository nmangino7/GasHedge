import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import Anthropic from "@anthropic-ai/sdk";

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
  const data = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({
      response:
        "Claude API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.",
      disclaimers: DISCLAIMERS,
    });
  }

  let contextStr = "";
  if (data.company_id) {
    const company = companyStore.get(data.company_id);
    if (company) {
      const gasPrice =
        (await getCurrentPrice("gasoline", company.padd_region)) || 3.5;
      const dieselPrice =
        (await getCurrentPrice("diesel", company.padd_region)) || 3.9;
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

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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
    return Response.json({
      response: `Unable to answer: ${e instanceof Error ? e.message : String(e)}`,
      disclaimers: DISCLAIMERS,
    });
  }
}
