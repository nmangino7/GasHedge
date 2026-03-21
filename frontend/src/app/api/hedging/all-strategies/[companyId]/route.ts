export const maxDuration = 30;
import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { compareAllStrategies } from "@/lib/hedging-engine";
import { getAllETFPrices } from "@/lib/alpha-vantage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = companyStore.get(Number(companyId));
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    const url = new URL(req.url);
    const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons = fuelType === "diesel"
      ? (company.monthly_gallons_diesel || 0)
      : (company.monthly_gallons_gasoline || 0);

    const [fuelPrice, etfPrices] = await Promise.all([
      getCurrentPrice(fuelType, company.padd_region),
      getAllETFPrices(),
    ]);

    const result = compareAllStrategies(
      monthlyGallons,
      fuelType,
      fuelPrice || 3.5,
      etfPrices,
      hedgeRatio
    );

    return Response.json({
      company_id: Number(companyId),
      company_name: company.name,
      fuel_type: fuelType,
      monthly_gallons: monthlyGallons,
      current_fuel_price: fuelPrice || 3.5,
      hedge_ratio: hedgeRatio,
      ...result,
    });
  } catch (e) {
    console.error("[All Strategies] Error:", e);
    return Response.json(
      { error: "Failed to calculate strategies", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
