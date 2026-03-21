import { getCurrentPrice, REGION_LABELS } from "@/lib/eia-service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fuelType = url.searchParams.get("fuel_type") || "gasoline";

  const regions = ["NUS", "R10", "R20", "R30", "R40", "R50"];
  const results = [];

  for (const regionCode of regions) {
    const price = await getCurrentPrice(fuelType, regionCode);
    if (price !== null) {
      results.push({
        region: regionCode,
        region_label: REGION_LABELS[regionCode] || regionCode,
        price_per_gallon: Math.round(price * 1000) / 1000,
      });
    }
  }

  return Response.json({ fuel_type: fuelType, regions: results });
}
