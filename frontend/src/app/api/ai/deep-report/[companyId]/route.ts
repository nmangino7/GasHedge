export const maxDuration = 60;
import { companyStore, DISCLAIMERS } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { calculateExposure, compareAllStrategies, DEFAULT_ETF_PRICES } from "@/lib/hedging-engine";
import { createAnthropicClient, AI_MODEL } from "@/lib/ai-client";

const SYSTEM_PROMPT = `You are a senior fuel cost management advisor preparing a comprehensive advisory report under a Series 65/66 investment-adviser registration.

SCOPE — THIS PLATFORM ONLY RECOMMENDS ETF + ETF OPTIONS STRATEGIES.
Do not describe or recommend commodity futures (RBOB, ULSD), options on futures, swaps, or anything requiring a Series 3 license. The adviser does not offer Series 3 products.

HEDGING APPROACHES TO COVER:

1. ETF ALLOCATION (foundation hedge):
   - UGA (Gasoline): ~88% correlation, 1.02% expense
   - USO (WTI / Diesel proxy): ~80% correlation, 0.86% expense
   - BNO (Brent Oil): ~78% correlation, 1.14% expense
   - UNL (12-month Natural Gas): ~72% correlation, 1.57% expense
   - K-1 tax form (Section 1256, 60/40 LTCG/STCG)

2. ETF OPTIONS OVERLAY (eight strategies):
   - Long Call — capped downside (premium), unlimited upside protection
   - Bull Call Spread — long call + short OTM call, cheaper, capped upside
   - Collar — long ETF + long put + short call, defined range, near-zero net cost
   - Covered Call — long ETF + short call, monthly income, capped upside
   - Cash-Secured Short Put — collect premium, willing to acquire ETF at strike
   - Long Put — downside protection on existing ETF holdings
   - Bear Put Spread — defined-range downside protection, lower premium
   - Iron Condor — short OTM call spread + short OTM put spread, income strategy

REPORT STRUCTURE — Write a comprehensive 10-section advisory report:
1. Executive Risk Assessment — Overall fuel risk profile
2. Market Conditions — Current price environment, volatility, trends
3. ETF Allocation Recommendation — Best ETF + tier (conservative / moderate / aggressive)
4. ETF Options Recommendation — Best option structure for this risk profile
5. Combined Strategy — How the ETF allocation and options overlay work together
6. Implementation Roadmap — Step-by-step plan: brokerage, options approval level, order entry
7. Risk Warnings — Tracking error, K-1 paperwork, options expiry, rolling, assignment risk
8. Cost-Benefit Analysis — Total cost vs. protection value across strategies
9. Tax Implications — K-1 / Section 1256 60/40 treatment, option leg tax treatment, advisory fees
10. Monitoring & Adjustment Plan — When to rebalance ETF, when to roll options, exit triggers

Be specific with numbers, percentages, strikes, expirations, and dollar amounts. Reference the company's actual data. Be plain-spoken — small-business owners are the ultimate audience.`;

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

STRATEGY OPTIONS AVAILABLE (Series 65/66 advisory only — ETF + ETF options):
ETF Allocation Strategies: ${JSON.stringify(allStrategies.etf.map(s => ({ tier: s.tier, investment: s.position.dollar_notional, annual_cost: s.position.annual_expense_cost, shares: s.position.shares_needed })), null, 2)}

ETF Options Strategies: ${JSON.stringify(allStrategies.comparison, null, 2)}

Please write a comprehensive advisory report covering both approaches. Do NOT reference commodity futures, options on futures, or any Series 3 strategies — the adviser holds Series 65/66 only.`,
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
