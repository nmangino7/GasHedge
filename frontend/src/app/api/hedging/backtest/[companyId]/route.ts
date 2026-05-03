export const maxDuration = 30;
import { companyStore } from "@/lib/store";
import { getPriceHistory } from "@/lib/eia-service";
import { historicalBacktest, CORRELATION, DEFAULT_ETF_PRICES } from "@/lib/hedging-engine";
import { getETFHistory } from "@/lib/alpha-vantage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const company = await companyStore.get(Number(companyId));
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  const url = new URL(req.url);
  const years = Math.min(
    Math.max(parseInt(url.searchParams.get("years") || "3"), 1),
    5
  );
  const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");
  const productTicker = url.searchParams.get("product_ticker") || "UGA";

  let fuelType: string;
  let monthlyGallons: number;
  if (company.fuel_type === "diesel") {
    fuelType = "diesel";
    monthlyGallons = company.monthly_gallons_diesel || 0;
  } else {
    fuelType = "gasoline";
    monthlyGallons = company.monthly_gallons_gasoline || 0;
  }

  const fuelPrices = await getPriceHistory(
    fuelType,
    company.padd_region,
    years
  );

  // Try to get real ETF history from Alpha Vantage, fall back to synthetic
  let etfPrices = await getETFHistory(productTicker, "full");
  if (etfPrices.length === 0 && fuelPrices.length > 0) {
    // Fallback: generate synthetic ETF prices from fuel price movements
    const basePrice = DEFAULT_ETF_PRICES[productTicker] || 50.0;
    const corr = (CORRELATION[fuelType] || {})[productTicker] || 0.8;
    const firstFuel = fuelPrices[0].value;
    etfPrices = fuelPrices.map((fp) => {
      const fuelChange = (fp.value - firstFuel) / firstFuel;
      const etfChange = fuelChange * corr;
      return {
        period: fp.period,
        value: Math.round(basePrice * (1 + etfChange) * 100) / 100,
      };
    });
  }

  const correlation =
    (CORRELATION[fuelType] || {})[productTicker] || 0.8;

  const result = historicalBacktest(
    monthlyGallons,
    fuelPrices,
    etfPrices,
    hedgeRatio,
    correlation
  );

  return Response.json({
    company_id: Number(companyId),
    product_ticker: productTicker,
    hedge_ratio: hedgeRatio,
    years,
    ...result,
  });
}
