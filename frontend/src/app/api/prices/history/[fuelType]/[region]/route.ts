import { getPriceHistory, REGION_LABELS } from "@/lib/eia-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fuelType: string; region: string }> }
) {
  const { fuelType, region } = await params;
  const url = new URL(req.url);
  const years = Math.min(Math.max(parseInt(url.searchParams.get("years") || "5"), 1), 10);

  const prices = await getPriceHistory(fuelType, region, years);
  return Response.json({
    fuel_type: fuelType,
    region,
    region_label: REGION_LABELS[region] || region,
    period_years: years,
    prices: prices.map((p) => ({ period: p.period, value: p.value })),
  });
}
