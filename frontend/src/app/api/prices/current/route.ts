import { getCurrentPrice, REGION_LABELS, fetchPrices } from "@/lib/eia-service";

export const maxDuration = 30;

export async function GET() {
  const results: {
    fuel_type: string;
    region: string;
    region_label: string;
    price_per_gallon: number;
    week_change: number;
    week_change_pct: number;
  }[] = [];

  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  // Fetch all in parallel instead of sequentially
  const tasks: { fuelType: string; regionCode: string }[] = [];
  for (const fuelType of ["gasoline", "diesel"]) {
    for (const regionCode of ["NUS", "R10", "R20", "R30", "R40", "R50"]) {
      tasks.push({ fuelType, regionCode });
    }
  }

  const fetches = await Promise.allSettled(
    tasks.map(({ fuelType, regionCode }) =>
      fetchPrices(fuelType, regionCode, start, end).then((history) => ({
        fuelType,
        regionCode,
        history,
      }))
    )
  );

  for (const result of fetches) {
    if (result.status !== "fulfilled") continue;
    const { fuelType, regionCode, history } = result.value;

    let price: number;
    let weekChange = 0;
    let weekChangePct = 0;

    if (history.length > 0) {
      price = history[history.length - 1].value;
      if (history.length >= 2) {
        weekChange = history[history.length - 1].value - history[history.length - 2].value;
        if (history[history.length - 2].value > 0) {
          weekChangePct = (weekChange / history[history.length - 2].value) * 100;
        }
      }
    } else {
      price = fuelType === "gasoline" ? 3.5 : 3.9;
    }

    results.push({
      fuel_type: fuelType,
      region: regionCode,
      region_label: REGION_LABELS[regionCode] || regionCode,
      price_per_gallon: Math.round(price * 1000) / 1000,
      week_change: Math.round(weekChange * 1000) / 1000,
      week_change_pct: Math.round(weekChangePct * 100) / 100,
    });
  }

  // If nothing came back at all, return fallback data
  if (results.length === 0) {
    results.push(
      { fuel_type: "gasoline", region: "NUS", region_label: "U.S. Average", price_per_gallon: 3.5, week_change: 0, week_change_pct: 0 },
      { fuel_type: "diesel", region: "NUS", region_label: "U.S. Average", price_per_gallon: 3.9, week_change: 0, week_change_pct: 0 }
    );
  }

  return Response.json({
    as_of: end,
    prices: results,
  });
}
