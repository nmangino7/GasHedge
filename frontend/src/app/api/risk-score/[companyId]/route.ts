export const maxDuration = 30;
import { companyStore, INDUSTRY_PROFILES } from "@/lib/store";
import { getCurrentPrice, getPriceHistory, calculateVolatility } from "@/lib/eia-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons = fuelType === "diesel"
      ? (company.monthly_gallons_diesel || 0)
      : (company.monthly_gallons_gasoline || 0);
    const annualFuelCost = monthlyGallons * 12 * 3.50; // estimate

    // Get volatility data
    const prices = await getPriceHistory(fuelType, company.padd_region, 2).catch(() => []);
    const vol = prices.length > 0 ? calculateVolatility(prices) : null;

    // Calculate risk factors (0-100 each)
    const volatilityScore = vol ? Math.min(100, Math.round(vol.annualized_volatility * 100 * 3)) : 50;

    const exposureScore = company.annual_revenue && company.annual_revenue > 0
      ? Math.min(100, Math.round((annualFuelCost / company.annual_revenue) * 100 * 3))
      : 50;

    const regionalRisk: Record<string, number> = { R50: 85, R10: 65, R40: 60, R30: 45, R20: 50, NUS: 55 };
    const regionScore = regionalRisk[company.padd_region] || 55;

    const fleetScore = Math.min(100, Math.round(company.fleet_size * 3));

    const hedgeCoverage = 0; // No active hedge tracked yet
    const coverageScore = 100 - hedgeCoverage; // Higher = more risk (unhedged)

    // Industry benchmark
    const profile = INDUSTRY_PROFILES[company.company_type];
    const industryAvgExposure = profile ? profile.fuel_pct_revenue.mid * 100 : 15;

    // Overall risk score (weighted average)
    const overallScore = Math.round(
      volatilityScore * 0.25 +
      exposureScore * 0.25 +
      regionScore * 0.15 +
      fleetScore * 0.15 +
      coverageScore * 0.20
    );

    const riskLevel = overallScore >= 70 ? "high" : overallScore >= 40 ? "moderate" : "low";

    return Response.json({
      company_id: Number(companyId),
      company_name: company.name,
      overall_score: overallScore,
      risk_level: riskLevel,
      factors: [
        { name: "Price Volatility", score: volatilityScore, benchmark: 50, description: "Based on annualized fuel price volatility in your region", recommendation: volatilityScore > 60 ? "High volatility — hedging is strongly recommended" : "Moderate volatility — hedging provides stability" },
        { name: "Fuel Exposure", score: exposureScore, benchmark: Math.round(industryAvgExposure * 3), description: `Fuel costs as percentage of revenue${company.annual_revenue ? ` ($${annualFuelCost.toLocaleString()} / $${company.annual_revenue.toLocaleString()})` : ""}`, recommendation: exposureScore > 60 ? "Fuel is a major cost driver — prioritize cost management" : "Manageable fuel exposure" },
        { name: "Regional Risk", score: regionScore, benchmark: 55, description: `${company.padd_region} region pricing tends to be ${regionScore > 65 ? "above" : "near"} national average`, recommendation: regionScore > 65 ? "Your region has higher-than-average fuel costs and volatility" : "Your region has relatively stable fuel pricing" },
        { name: "Fleet Size", score: fleetScore, benchmark: 30, description: `${company.fleet_size} vehicles consuming ${monthlyGallons.toLocaleString()} gallons/month`, recommendation: fleetScore > 50 ? "Large fleet amplifies price exposure — consider hedging" : "Smaller fleet, lower absolute risk" },
        { name: "Hedge Coverage", score: coverageScore, benchmark: 50, description: "Percentage of fuel consumption currently unhedged", recommendation: coverageScore > 70 ? "No active hedge — implement a hedging strategy to reduce risk" : "Partially hedged — consider increasing coverage" },
      ],
      trend: vol?.trend || "stable",
      volatility_data: vol,
    });
  } catch (e) {
    console.error("[Risk Score] Error:", e);
    return Response.json({ error: "Failed to calculate risk score", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
