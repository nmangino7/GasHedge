export const maxDuration = 30;
import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { recommendStrategy } from "@/lib/hedging-engine";
import { getAllETFPrices } from "@/lib/alpha-vantage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = companyStore.get(Number(companyId));
    if (!company)
      return Response.json({ error: "Company not found" }, { status: 404 });

    let fuelType: string;
    let monthlyGallons: number;
    if (company.fuel_type === "gasoline") {
      fuelType = "gasoline";
      monthlyGallons = company.monthly_gallons_gasoline || 0;
    } else if (company.fuel_type === "diesel") {
      fuelType = "diesel";
      monthlyGallons = company.monthly_gallons_diesel || 0;
    } else {
      fuelType = "gasoline";
      monthlyGallons =
        (company.monthly_gallons_gasoline || 0) +
        (company.monthly_gallons_diesel || 0);
    }

    const fuelPrice =
      (await getCurrentPrice(fuelType, company.padd_region)) || 3.5;

    const etfPrices = await getAllETFPrices();

    const recommendations = recommendStrategy(
      fuelType,
      monthlyGallons,
      fuelPrice,
      etfPrices
    );

    return Response.json({
      company_id: Number(companyId),
      company_name: company.name,
      fuel_type: fuelType,
      monthly_gallons: monthlyGallons,
      current_fuel_price: fuelPrice,
      recommendations,
    });
  } catch (e) {
    console.error("[Hedging Recommend] Error:", e);
    return Response.json(
      { error: "Failed to generate recommendations", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
