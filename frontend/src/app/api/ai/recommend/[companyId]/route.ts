export const maxDuration = 30;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import {
  calculateExposure,
  recommendStrategy,
  DEFAULT_ETF_PRICES,
} from "@/lib/hedging-engine";
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
- Never make specific buy/sell recommendations — frame as analysis and advisory
- You are NOT a broker — you are an investment adviser providing guidance`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const company = companyStore.get(Number(companyId));
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      response:
        "Claude API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.",
      disclaimers: DISCLAIMERS,
    });
  }

  const fuelType =
    company.fuel_type === "diesel" ? "diesel" : "gasoline";
  const monthlyGallons =
    fuelType === "diesel"
      ? company.monthly_gallons_diesel || 0
      : company.monthly_gallons_gasoline || 0;

  const gasPrice =
    (await getCurrentPrice("gasoline", company.padd_region)) || 3.5;
  const dieselPrice =
    (await getCurrentPrice("diesel", company.padd_region)) || 3.9;
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

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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

Please provide:
1. A clear recommendation on which strategy tier is best
2. A plain-language explanation of how the hedge works
3. The key risks and costs
4. Expected outcomes in different price scenarios`,
        },
      ],
    });
    return Response.json({
      response:
        message.content[0].type === "text" ? message.content[0].text : "",
      disclaimers: DISCLAIMERS,
    });
  } catch (e) {
    return Response.json({
      response: `Unable to generate AI recommendation: ${e instanceof Error ? e.message : String(e)}`,
      disclaimers: DISCLAIMERS,
    });
  }
}
