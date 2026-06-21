// Market-data facade with provenance. Wraps the existing EIA / Yahoo / Alpha
// Vantage clients and reports whether each value is live or a fallback estimate.
//
// Source priority:
//   fuel prices  → EIA (needs EIA_API_KEY) → fallback constant
//   ETF prices   → Yahoo (no key) → Alpha Vantage (needs key) → fallback constant
//   fuel vol     → EIA history → modeled default

import { fetchPrices, FALLBACK_PRICES, calculateVolatility } from "@/lib/eia-service";
import { getQuote } from "@/lib/yahoo-options";
import { getETFPrice } from "@/lib/alpha-vantage";
import { DEFAULT_ETF_PRICES, DEFAULT_FUEL_VOL, FuelType } from "@/domain/finance/constants";
import { Sourced, sourced } from "./provenance";

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function eiaKeyConfigured(): boolean {
  const k = process.env.EIA_API_KEY;
  return Boolean(k && k !== "your_eia_api_key_here");
}

/** Current retail fuel price for a fuel/region, with provenance. */
export async function getFuelPrice(
  fuelType: string,
  region: string
): Promise<Sourced<number>> {
  const fallback = FALLBACK_PRICES[fuelType] ?? 3.5;
  if (!eiaKeyConfigured()) {
    return sourced(fallback, "fallback", "fallback estimate", "Set EIA_API_KEY for live retail prices.");
  }
  try {
    const prices = await fetchPrices(fuelType, region, isoDaysAgo(45), isoDaysAgo(0));
    if (prices.length > 0) {
      const latest = prices[prices.length - 1];
      return sourced(latest.value, "live", "EIA", `Week of ${latest.period}`);
    }
  } catch {
    /* fall through to fallback */
  }
  return sourced(fallback, "fallback", "fallback estimate", "EIA returned no data.");
}

/** Current ETF price for a ticker, with provenance (Yahoo → Alpha Vantage → fallback). */
export async function getEtfPrice(ticker: string): Promise<Sourced<number>> {
  try {
    const q = await getQuote(ticker);
    if (q.price > 0) return sourced(q.price, "live", "Yahoo Finance", q.asOf);
  } catch {
    /* try secondary */
  }
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const p = await getETFPrice(ticker);
      if (p > 0) return sourced(p, "live", "Alpha Vantage");
    } catch {
      /* fall through */
    }
  }
  return sourced(DEFAULT_ETF_PRICES[ticker] ?? 50, "fallback", "fallback estimate", "No live ETF quote available.");
}

/** Annualized fuel-price volatility (σ_fuel) with provenance. */
export async function getFuelVolatility(
  fuelType: FuelType,
  region: string
): Promise<Sourced<number>> {
  const fallback = DEFAULT_FUEL_VOL[fuelType];
  if (!eiaKeyConfigured()) {
    return sourced(fallback, "fallback", "modeled default", "Set EIA_API_KEY to derive σ from history.");
  }
  try {
    const history = await fetchPrices(fuelType, region, isoDaysAgo(730), isoDaysAgo(0));
    if (history.length > 5) {
      const vol = calculateVolatility(history);
      if (vol.annualized_volatility > 0) {
        return sourced(vol.annualized_volatility, "live", "EIA (derived)", `${history.length} weeks`);
      }
    }
  } catch {
    /* fall through */
  }
  return sourced(fallback, "fallback", "modeled default");
}
