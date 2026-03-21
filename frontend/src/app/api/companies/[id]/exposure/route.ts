import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { calculateExposure } from "@/lib/hedging-engine";

export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const company = companyStore.get(Number(id));
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  const gasPrice =
    (await getCurrentPrice("gasoline", company.padd_region)) || 3.5;
  const dieselPrice =
    (await getCurrentPrice("diesel", company.padd_region)) || 3.9;

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
}
