// Alpha Vantage API integration for real-time ETF prices
// Env var: APLAG_1 (set in Vercel dashboard)

const AV_BASE = "https://www.alphavantage.co/query";

const DEFAULT_PRICES: Record<string, number> = {
  UGA: 58.0,
  USO: 72.0,
  BNO: 30.0,
  UNL: 8.0,
};

export async function getETFPrice(ticker: string): Promise<number> {
  const apiKey = process.env.APLAG_1 || "";
  if (!apiKey) {
    console.warn("[AlphaVantage] No API key (APLAG_1) configured");
    return DEFAULT_PRICES[ticker] || 50.0;
  }

  try {
    const params = new URLSearchParams({
      function: "GLOBAL_QUOTE",
      symbol: ticker,
      apikey: apiKey,
    });

    const res = await fetch(`${AV_BASE}?${params}`, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[AlphaVantage] API returned ${res.status}`);
      return DEFAULT_PRICES[ticker] || 50.0;
    }

    const data = await res.json();

    // Check for rate limit message
    if (data["Note"] || data["Information"]) {
      console.warn("[AlphaVantage] Rate limited:", data["Note"] || data["Information"]);
      return DEFAULT_PRICES[ticker] || 50.0;
    }

    const quote = data["Global Quote"];
    if (quote && quote["05. price"]) {
      return parseFloat(quote["05. price"]);
    }

    console.warn(`[AlphaVantage] No quote data for ${ticker}`);
    return DEFAULT_PRICES[ticker] || 50.0;
  } catch (err) {
    console.error(`[AlphaVantage] Error fetching ${ticker}:`, err);
    return DEFAULT_PRICES[ticker] || 50.0;
  }
}

export async function getAllETFPrices(): Promise<Record<string, number>> {
  const tickers = ["UGA", "USO", "BNO", "UNL"];
  const prices: Record<string, number> = {};

  // Fetch sequentially to avoid rate limits (5 calls/min on free tier)
  for (const ticker of tickers) {
    prices[ticker] = await getETFPrice(ticker);
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
