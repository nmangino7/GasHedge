export const maxDuration = 30;
import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { recommendEtfOptionsStrategies } from "@/lib/hedging-engine";
import { getMultipleQuotes } from "@/lib/yahoo-options";

const DEFAULT_PRICES: Record<string, number> = {
  UGA: 58,
  USO: 72,
  BNO: 30,
  UNL: 8,
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }
    const url = new URL(req.url);
    const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons =
      fuelType === "diesel"
        ? company.monthly_gallons_diesel || 0
        : company.monthly_gallons_gasoline || 0;

    const [fuelPrice, liveQuotes] = await Promise.all([
      getCurrentPrice(fuelType, company.padd_region),
      getMultipleQuotes(["UGA", "USO", "BNO", "UNL"]).catch(() => ({})),
    ]);

    const etfPrices: Record<string, number> = { ...DEFAULT_PRICES };
    for (const [k, v] of Object.entries(liveQuotes)) {
      if (v?.price && v.price > 0) etfPrices[k] = v.price;
    }

    const strategies = recommendEtfOptionsStrategies(
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
      etf_prices: etfPrices,
      live_quotes_available: Object.keys(liveQuotes).length > 0,
      strategies,
    });
  } catch (err) {
    console.error("[ETF Options] Error:", err);
    return Response.json(
      { error: "Failed to compute strategies", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
