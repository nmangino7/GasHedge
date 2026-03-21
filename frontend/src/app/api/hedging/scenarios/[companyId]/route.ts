import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { calculateHedgePosition, scenarioAnalysis } from "@/lib/hedging-engine";
import { getETFPrice } from "@/lib/alpha-vantage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const company = companyStore.get(Number(companyId));
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  const url = new URL(req.url);
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

  const fuelPrice =
    (await getCurrentPrice(fuelType, company.padd_region)) || 3.5;
  const etfPrice = await getETFPrice(productTicker);

  const position = calculateHedgePosition(
    monthlyGallons,
    fuelType,
    productTicker,
    hedgeRatio,
    fuelPrice,
    etfPrice
  );

  const scenarios = scenarioAnalysis(monthlyGallons, position, fuelPrice);

  return Response.json({
    company_id: Number(companyId),
    hedge_position: position,
    scenarios,
  });
}
