export const maxDuration = 30;
import { companyStore } from "@/lib/store";
import { getCurrentPrice, getPriceHistory, calculateVolatility } from "@/lib/eia-service";
import {
  calculateHedgePosition,
  detailedScenarioAnalysis,
  recommendStrategy,
} from "@/lib/hedging-engine";
import { getETFPrice, getAllETFPrices } from "@/lib/alpha-vantage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company)
      return Response.json({ error: "Company not found" }, { status: 404 });

    const url = new URL(req.url);
    const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");
    const productTicker = url.searchParams.get("product_ticker") || "UGA";

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons = fuelType === "diesel"
      ? (company.monthly_gallons_diesel || 0)
      : (company.monthly_gallons_gasoline || 0);

    // Fetch data in parallel
    const [fuelPriceRaw, etfPrice, allEtfPrices, volatilityData] = await Promise.all([
      getCurrentPrice(fuelType, company.padd_region),
      getETFPrice(productTicker),
      getAllETFPrices(),
      getPriceHistory(fuelType, company.padd_region, 2).then(prices => calculateVolatility(prices)).catch(() => null),
    ]);

    const fuelPrice = fuelPriceRaw || 3.5;

    // Position for selected hedge ratio
    const position = calculateHedgePosition(
      monthlyGallons,
      fuelType,
      productTicker,
      hedgeRatio,
      fuelPrice,
      etfPrice
    );

    // Detailed scenarios with breakeven
    const detailedData = detailedScenarioAnalysis(monthlyGallons, position, fuelPrice);

    // All 3 strategy tiers
    const strategies = recommendStrategy(fuelType, monthlyGallons, fuelPrice, allEtfPrices);

    return Response.json({
      company: {
        id: company.id,
        name: company.name,
        company_type: company.company_type,
        fuel_type: fuelType,
        fleet_size: company.fleet_size,
        region: company.padd_region,
        monthly_gallons: monthlyGallons,
        annual_revenue: company.annual_revenue,
      },
      current_price: fuelPrice,
      strategies,
      selected_hedge_ratio: hedgeRatio,
      selected_ticker: productTicker,
      hedge_position: position,
      detailed_scenarios: detailedData,
      volatility: volatilityData ? {
        annualized_volatility: volatilityData.annualized_volatility,
        trend: volatilityData.trend,
        price_range_52w: volatilityData.price_range_52w,
      } : null,
    });
  } catch (e) {
    console.error("[Detailed Report] Error:", e);
    return Response.json(
      { error: "Failed to generate detailed report", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
