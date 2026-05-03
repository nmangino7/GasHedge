import { companyStore } from "@/lib/store";
import { getCurrentPrice, FALLBACK_PRICES } from "@/lib/eia-service";
import { calculateExposure } from "@/lib/hedging-engine";

export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await companyStore.get(Number(id));
    if (!company)
      return Response.json({ detail: "Company not found" }, { status: 404 });

    let gasPrice: number;
    let dieselPrice: number;
    try {
      gasPrice = await getCurrentPrice("gasoline", company.padd_region);
      dieselPrice = await getCurrentPrice("diesel", company.padd_region);
    } catch {
      gasPrice = FALLBACK_PRICES.gasoline;
      dieselPrice = FALLBACK_PRICES.diesel;
    }

    const exposure = calculateExposure(
      company.monthly_gallons_gasoline || 0,
      company.monthly_gallons_diesel || 0,
      gasPrice,
      dieselPrice,
      company.annual_revenue
    );

    return Response.json({
      company_id: company.id,
      company_name: company.name,
      fuel_type: company.fuel_type,
      ...exposure,
    });
  } catch (e) {
    console.error("[Exposure] Unhandled error:", e);
    return Response.json(
      { detail: `Internal error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
