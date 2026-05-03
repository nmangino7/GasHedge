export const maxDuration = 60;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { calculateExposure, compareAllStrategies, DEFAULT_ETF_PRICES } from "@/lib/hedging-engine";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a senior fuel cost management advisor preparing a comprehensive advisory report.
You provide deep, actionable analysis covering ALL hedging approaches available to the client.

HEDGING APPROACHES TO COVER:

1. ETF-BASED HEDGING (Available with Series 65/66):
   - UGA (US Gasoline Fund): 88% correlation, 0.97% expense ratio
   - USO (US Oil Fund): 80% correlation, 0.81% expense ratio
   - BNO (US Brent Oil Fund): 78% correlation, 0.90% expense ratio
   - Pros: Simple, liquid, no special license beyond advisory
   - Cons: Tracking error, contango losses, K-1 tax forms

2. OPTIONS-BASED HEDGING (Requires Series 3):
   - Buy call options on RBOB gasoline or ULSD diesel futures
   - Premium is ~5-8% of notional for 6-month at-the-money
   - Max loss = premium paid (capped downside)
   - Higher correlation to actual fuel prices (90-95%)
   - More cost-effective than ETFs for larger positions
   - Cons: Requires Series 3 license, options expire

3. FUTURES-BASED HEDGING (Requires Series 3):
   - RBOB Gasoline futures (NYMEX) — 42,000 gal/contract
   - ULSD Diesel futures (NYMEX) — 42,000 gal/contract
   - Strongest correlation (92-95% to retail prices)
   - No expense ratio — only margin and commissions
   - Cons: Margin calls, daily settlement, high complexity, Series 3 required

SERIES 3 LICENSE PATH:
- National Commodity Futures Examination
- Administered by FINRA, sponsored by NFA member firm
- ~80 hours study, $140 exam fee
- Covers futures, options on futures, regulations
- With Series 3, the advisor can offer all three approaches

REPORT STRUCTURE — Write a comprehensive advisory report with these sections:
1. Executive Risk Assessment — Overall fuel risk profile
2. Market Conditions — Current price environment, volatility, trends
3. Strategy Comparison — All 3 approaches compared with pros/cons/costs
4. Recommended Approach — Primary recommendation with justification
5. Implementation Roadmap — Step-by-step plan for the recommended approach
6. Risk Warnings — Edge cases, worst-case scenarios, margin risk
7. Licensing Considerations — What licenses are needed and how to get them
8. Cost-Benefit Analysis — Total cost vs. protection value for each approach
9. Tax Implications — K-1 (ETFs), 60/40 rule (futures/options), advisory fees
10. Monitoring & Adjustment Plan — When to rebalance, exit triggers, KPIs

Be specific with numbers, percentages, and dollar amounts. Reference the company's actual data.`;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company)
      return Response.json({ error: "Company not found" }, { status: 404 });

    const client = createAnthropicClient();
    if (!client) {
      return Response.json(
        { error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables." },
        { status: 503 }
      );
    }

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons = fuelType === "diesel"
      ? (company.monthly_gallons_diesel || 0)
      : (company.monthly_gallons_gasoline || 0);

    const gasPrice = await getCurrentPrice("gasoline", company.padd_region);
    const dieselPrice = await getCurrentPrice("diesel", company.padd_region);
    const fuelPrice = fuelType === "gasoline" ? gasPrice : dieselPrice;

    const exposure = calculateExposure(
      company.monthly_gallons_gasoline || 0,
      company.monthly_gallons_diesel || 0,
      gasPrice, dieselPrice,
      company.annual_revenue
    );

    const allStrategies = compareAllStrategies(
      monthlyGallons, fuelType, fuelPrice, DEFAULT_ETF_PRICES, 0.5
    );

    const message = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a comprehensive fuel hedging advisory report for this company:

COMPANY PROFILE:
- Name: ${company.name}
- Type: ${company.company_type}
- Fleet Size: ${company.fleet_size} vehicles
- Fuel Type: ${fuelType}
- Region: ${company.padd_region}
- Monthly Gallons: ${monthlyGallons.toLocaleString()}

FUEL EXPOSURE:
- Monthly Fuel Cost: $${exposure.monthly_fuel_cost.toLocaleString()}
- Annual Fuel Cost: $${exposure.annual_fuel_cost.toLocaleString()}
- Fuel as % of Revenue: ${exposure.fuel_pct_revenue || "N/A"}%

STRATEGY OPTIONS AVAILABLE:
ETF Strategies: ${JSON.stringify(allStrategies.etf.map(s => ({ tier: s.tier, investment: s.position.dollar_notional, annual_cost: s.position.annual_expense_cost, shares: s.position.shares_needed })), null, 2)}

Options Strategy: ${JSON.stringify(allStrategies.options, null, 2)}

Futures Strategy: ${JSON.stringify(allStrategies.futures, null, 2)}

Please write the full 10-section advisory report covering all approaches.`,
        },
      ],
    });

    return Response.json({
      response: message.content[0].type === "text" ? message.content[0].text : "",
      disclaimers: DISCLAIMERS,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[AI Deep Report] Error:", errMsg);
    return Response.json(
      { error: `Deep report error: ${errMsg}` },
      { status: 502 }
    );
  }
}
