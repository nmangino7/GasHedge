export const maxDuration = 30;
import { NextRequest } from "next/server";
import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { recommendEtfOptionsStrategies } from "@/lib/hedging-engine";
import { getMultipleQuotes } from "@/lib/yahoo-options";
import { buildScenarios } from "@/lib/options-scenario";
import { getEtfMeta } from "@/lib/etf-library";

const DEFAULT_PRICES: Record<string, number> = { UGA: 122, USO: 144, BNO: 57, UNL: 6.5 };

export async function GET(
  req: NextRequest,
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
    const strategyKey = url.searchParams.get("strategy") ?? "collar";

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

    const allStrategies = recommendEtfOptionsStrategies(
      monthlyGallons,
      fuelType,
      fuelPrice || 3.5,
      etfPrices,
      hedgeRatio
    );

    const selected =
      allStrategies.find((s) => s.strategy_key === strategyKey) ?? allStrategies[0];
    const meta = getEtfMeta(selected.ticker);
    const correlation = meta?.correlation_to_retail ?? 0.85;

    const result = buildScenarios({
      strategy: selected,
      monthlyGallons,
      currentFuelPrice: fuelPrice || 3.5,
      correlation,
    });

    return Response.json({
      company_id: Number(companyId),
      company_name: company.name,
      fuel_type: fuelType,
      strategies: allStrategies.map((s) => ({
        key: s.strategy_key,
        name: s.display_name,
        ticker: s.ticker,
        premium_label: s.total_premium_label,
        contracts: s.contracts,
        max_loss: s.max_loss,
        max_gain: s.max_gain,
        hedge_fit: s.hedge_fit,
      })),
      selected_strategy: {
        ...selected,
      },
      etf_prices: etfPrices,
      as_of: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[Modeler] Error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
