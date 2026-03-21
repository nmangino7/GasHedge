export const maxDuration = 30;
import { getCurrentPrice, REGION_LABELS } from "@/lib/eia-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fuelType: string; region: string }> }
) {
  const { fuelType, region } = await params;
  const price = await getCurrentPrice(fuelType, region);
  if (price === null) {
    return Response.json(
      { fuel_type: fuelType, region, price_per_gallon: null, error: "No data available" }
    );
  }
  return Response.json({
    fuel_type: fuelType,
    region,
    region_label: REGION_LABELS[region] || region,
    price_per_gallon: Math.round(price * 1000) / 1000,
  });
}
