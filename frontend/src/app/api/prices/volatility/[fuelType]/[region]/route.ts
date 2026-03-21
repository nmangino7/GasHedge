export const maxDuration = 30;
import { getPriceHistory, calculateVolatility } from "@/lib/eia-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fuelType: string; region: string }> }
) {
  const { fuelType, region } = await params;
  const prices = await getPriceHistory(fuelType, region, 2);
  const vol = calculateVolatility(prices);
  return Response.json({
    fuel_type: fuelType,
    region,
    ...vol,
  });
}
