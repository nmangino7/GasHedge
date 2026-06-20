// ETF price integration. Primary source is Yahoo Finance (no key required);
// Alpha Vantage (env var APLAG_1) is an optional secondary; hardcoded defaults
// are the last-resort fallback.

import { getQuote, getMultipleQuotes } from "./yahoo-options";

const AV_BASE = "https://www.alphavantage.co/query";

const DEFAULT_PRICES: Record<string, number> = {
  UGA: 58.0,
  USO: 72.0,
  BNO: 30.0,
  UNL: 8.0,
};

const ETF_TICKERS = ["UGA", "USO", "BNO", "UNL"];

export async function getETFPrice(ticker: string): Promise<number> {
  // 1) Yahoo (keyless, live).
  try {
    const q = await getQuote(ticker);
    if (q.price > 0) return q.price;
  } catch {
    /* fall through to Alpha Vantage / default */
  }
  // 2) Alpha Vantage (optional secondary).
  const avPrice = await getETFPriceAlphaVantage(ticker);
  if (avPrice != null) return avPrice;
  // 3) Fallback.
  return DEFAULT_PRICES[ticker] || 50.0;
}

async function getETFPriceAlphaVantage(ticker: string): Promise<number | null> {
  const apiKey = process.env.APLAG_1 || "";
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({
      function: "GLOBAL_QUOTE",
      symbol: ticker,
      apikey: apiKey,
    });
    const res = await fetch(`${AV_BASE}?${params}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data["Note"] || data["Information"]) return null; // rate limited
    const quote = data["Global Quote"];
    if (quote && quote["05. price"]) return parseFloat(quote["05. price"]);
    return null;
  } catch {
    return null;
  }
}

export async function getAllETFPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  // 1) Yahoo batch (keyless, live) — fills what it can.
  try {
    const quotes = await getMultipleQuotes(ETF_TICKERS);
    for (const t of ETF_TICKERS) {
      const p = quotes[t]?.price;
      if (p && p > 0) prices[t] = p;
    }
  } catch {
    /* fall through */
  }
  // 2) Backfill any gaps from Alpha Vantage (if keyed), else defaults.
  for (const t of ETF_TICKERS) {
    if (prices[t]) continue;
    const av = await getETFPriceAlphaVantage(t);
    prices[t] = av ?? DEFAULT_PRICES[t] ?? 50.0;
  }
  return prices;
}

export async function getETFHistory(
  ticker: string,
  outputSize: "compact" | "full" = "compact"
): Promise<{ period: string; value: number }[]> {
  const apiKey = process.env.APLAG_1 || "";
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      function: "TIME_SERIES_WEEKLY_ADJUSTED",
      symbol: ticker,
      outputsize: outputSize,
      apikey: apiKey,
    });

    const res = await fetch(`${AV_BASE}?${params}`, { cache: "no-store" });
    if (!res.ok) return [];

    const data = await res.json();

    if (data["Note"] || data["Information"]) {
      console.warn("[AlphaVantage] Rate limited");
      return [];
    }

    const timeSeries = data["Weekly Adjusted Time Series"];
    if (!timeSeries) return [];

    const points: { period: string; value: number }[] = [];
    for (const [date, values] of Object.entries(timeSeries)) {
      const val = values as Record<string, string>;
      points.push({
        period: date,
        value: parseFloat(val["4. close"]),
      });
    }

    // Sort ascending by date
    points.sort((a, b) => a.period.localeCompare(b.period));
    return points;
  } catch (err) {
    console.error(`[AlphaVantage] Error fetching history for ${ticker}:`, err);
    return [];
  }
}
