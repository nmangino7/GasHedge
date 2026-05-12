export const maxDuration = 30;
import { NextRequest } from "next/server";
import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { recommendEtfOptionsStrategies } from "@/lib/hedging-engine";
import { getMultipleQuotes, getOptionsChain } from "@/lib/yahoo-options";
import { buildScenarios } from "@/lib/options-scenario";
import { buildPayoffGrid, type PayoffLeg } from "@/lib/payoff";
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
    const strategyKey = url.searchParams.get("strategy") ?? "long_call";
    const dteOverride = url.searchParams.get("dte");
    const ivOverrideParam = url.searchParams.get("iv");

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
    const daysToExpiry = dteOverride ? parseInt(dteOverride, 10) : selected.expiry_days;

    // Pull real options chain to get market IVs where available
    let chainIvByStrike: Record<string, number> = {};
    let chainQuoteByStrike: Record<string, { mid: number | null; bid: number | null; ask: number | null; oi: number | null; volume: number | null }> = {};
    try {
      const chain = await getOptionsChain(selected.ticker);
      // Pick expiry closest to our target DTE
      const closestExp = chain.expirations.reduce<typeof chain.expirations[number] | null>(
        (best, e) =>
          !best || Math.abs(e.daysToExpiry - daysToExpiry) < Math.abs(best.daysToExpiry - daysToExpiry)
            ? e
            : best,
        null
      );
      if (closestExp) {
        for (const c of [...closestExp.calls, ...closestExp.puts]) {
          const key = `${c.strike}-${closestExp.calls.includes(c) ? "call" : "put"}`;
          if (c.impliedVolatility) chainIvByStrike[key] = c.impliedVolatility;
          chainQuoteByStrike[key] = {
            mid: c.mid,
            bid: c.bid,
            ask: c.ask,
            oi: c.openInterest,
            volume: c.volume,
          };
        }
      }
    } catch {
      // Falls back to modeled IV
    }

    // Build payoff legs — prefer market IV when available
    const ivOverride = ivOverrideParam ? parseFloat(ivOverrideParam) : null;
    const legs: PayoffLeg[] = selected.legs.map((leg) => {
      const chainKey = `${leg.strike}-${leg.option_type}`;
      const marketIv = chainIvByStrike[chainKey];
      const iv = ivOverride ?? marketIv ?? leg.iv_used ?? 0.35;
      const marketPrice = chainQuoteByStrike[chainKey]?.mid;
      // Use market mid as entry premium if available — otherwise BS-modeled premium
      const entryPremium = marketPrice && marketPrice > 0 ? marketPrice : leg.premium_per_share;
      return {
        side: leg.side,
        option_type: leg.option_type,
        strike: leg.strike,
        contracts: leg.contracts,
        entry_premium_per_share: entryPremium,
        iv,
      };
    });

    const underlying = selected.shares_required
      ? {
          shares: selected.shares_required,
          entry_price: selected.underlying_price,
        }
      : undefined;

    // Average IV across the position legs for POP / time-slice math
    const avgIv = legs.reduce((acc, l) => acc + l.iv, 0) / legs.length;

    const payoffGrid = buildPayoffGrid({
      legs,
      underlying,
      spot: selected.underlying_price,
      daysToExpiry,
      iv: avgIv,
      currentFuelPrice: fuelPrice || 3.5,
      correlation,
      range: 0.5,
      steps: 80,
    });

    // Also build the fuel-cost scenario table (annual savings framing)
    const scenarioResult = buildScenarios({
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
        // Override premium per share with market values if pulled
        legs: selected.legs.map((leg, i) => ({
          ...leg,
          premium_per_share: legs[i].entry_premium_per_share,
          iv_used: legs[i].iv,
        })),
      },
      etf_prices: etfPrices,
      payoff: payoffGrid,
      // legacy fuel-scenario table for the existing scenario view
      ...scenarioResult,
      market_data: {
        used_live_chain: Object.keys(chainQuoteByStrike).length > 0,
        chain_legs: legs.map((leg, i) => {
          const key = `${leg.strike}-${leg.option_type}`;
          return {
            leg_index: i,
            strike: leg.strike,
            option_type: leg.option_type,
            market_iv: chainIvByStrike[key] ?? null,
            market_mid: chainQuoteByStrike[key]?.mid ?? null,
            market_bid: chainQuoteByStrike[key]?.bid ?? null,
            market_ask: chainQuoteByStrike[key]?.ask ?? null,
            open_interest: chainQuoteByStrike[key]?.oi ?? null,
            volume: chainQuoteByStrike[key]?.volume ?? null,
          };
        }),
      },
      as_of: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Modeler] Error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
