const EIA_BASE_URL = "https://api.eia.gov/v2/petroleum/pri/gnd/data/";
const FETCH_TIMEOUT_MS = 8000; // 8 second timeout for EIA API calls

const REGION_MAP: Record<string, string> = {
  US: "NUS", "East Coast": "R10", Midwest: "R20", "Gulf Coast": "R30",
  "Rocky Mountain": "R40", "West Coast": "R50",
  R10: "R10", R20: "R20", R30: "R30", R40: "R40", R50: "R50", NUS: "NUS",
};

const PRODUCT_MAP: Record<string, string> = {
  gasoline: "EPM0",
  diesel: "EPD2D",
};

export const REGION_LABELS: Record<string, string> = {
  NUS: "U.S. Average",
  R10: "East Coast (PADD 1)",
  R20: "Midwest (PADD 2)",
  R30: "Gulf Coast (PADD 3)",
  R40: "Rocky Mountain (PADD 4)",
  R50: "West Coast (PADD 5)",
};

// Fallback prices if EIA API fails
export const FALLBACK_PRICES: Record<string, number> = {
  gasoline: 3.50,
  diesel: 3.90,
};

interface PricePoint {
  period: string;
  value: number;
}

export async function fetchPrices(
  fuelType: string,
  region: string,
  startDate: string,
  endDate: string
): Promise<PricePoint[]> {
  const apiKey = process.env.EIA_API_KEY || "";
  if (!apiKey || apiKey === "your_eia_api_key_here") {
    console.warn("[EIA] No API key configured");
    return [];
  }

  const duoarea = REGION_MAP[region] || "NUS";
  const product = PRODUCT_MAP[fuelType] || "EPM0";

  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: "weekly",
    "data[0]": "value",
    "facets[duoarea][]": duoarea,
    "facets[product][]": product,
    start: startDate,
    end: endDate,
    "sort[0][column]": "period",
    "sort[0][direction]": "asc",
    length: "5000",
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${EIA_BASE_URL}?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`[EIA] API returned ${res.status}: ${res.statusText}`);
      return [];
    }
    const data = await res.json();

    const prices: PricePoint[] = [];
    for (const row of data?.response?.data || []) {
      if (row.value != null) {
        prices.push({ period: row.period, value: Number(row.value) });
      }
    }
    if (prices.length === 0) {
      console.warn(`[EIA] No price data returned for ${fuelType}/${region}`);
    }
    return prices;
  } catch (err) {
    console.error("[EIA] Fetch error:", err);
    return [];
  }
}

export async function getCurrentPrice(
  fuelType: string,
  region: string
): Promise<number> {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const prices = await fetchPrices(fuelType, region, start, end);
  if (prices.length > 0) return prices[prices.length - 1].value;
  return FALLBACK_PRICES[fuelType] || 3.50;
}

export async function getPriceHistory(
  fuelType: string,
  region: string,
  years: number = 5
): Promise<PricePoint[]> {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - years * 365 * 86400000)
    .toISOString()
    .slice(0, 10);
  return fetchPrices(fuelType, region, start, end);
}

export async function getAllCurrentPrices() {
  // Fetch all 12 region/fuel combos in parallel
  const combos: { fuelType: string; regionCode: string }[] = [];
  for (const fuelType of ["gasoline", "diesel"]) {
    for (const regionCode of ["NUS", "R10", "R20", "R30", "R40", "R50"]) {
      combos.push({ fuelType, regionCode });
    }
  }

  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const settled = await Promise.allSettled(
    combos.map(({ fuelType, regionCode }) =>
      fetchPrices(fuelType, regionCode, start, end).then((history) => ({
        fuelType,
        regionCode,
        history,
      }))
    )
  );

  return combos.map((combo, i) => {
    const result = settled[i];
    let price: number;
    let weekChange = 0;
    let weekChangePct = 0;

    if (result.status === "fulfilled" && result.value.history.length > 0) {
      const history = result.value.history;
      price = history[history.length - 1].value;
      if (history.length >= 2) {
        weekChange = history[history.length - 1].value - history[history.length - 2].value;
        if (history[history.length - 2].value > 0) {
          weekChangePct = (weekChange / history[history.length - 2].value) * 100;
        }
      }
    } else {
      price = FALLBACK_PRICES[combo.fuelType] || 3.50;
    }

    return {
      fuel_type: combo.fuelType,
      region: combo.regionCode,
      region_label: REGION_LABELS[combo.regionCode] || combo.regionCode,
      price_per_gallon: Math.round(price * 1000) / 1000,
      week_change: Math.round(weekChange * 1000) / 1000,
      week_change_pct: Math.round(weekChangePct * 100) / 100,
    };
  });
}

export function calculateVolatility(prices: PricePoint[], window = 52) {
  const values = prices.map((p) => p.value);
  if (values.length < 2) {
    return {
      annualized_volatility: 0,
      weekly_std_dev: 0,
      price_range_52w: { min: 0, max: 0 },
      current_vs_52w_avg: 0,
      trend: "stable" as const,
    };
  }

  const recent = values.length >= window ? values.slice(-window) : values;

  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1] > 0) {
      returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
    }
  }

  if (returns.length === 0) {
    return {
      annualized_volatility: 0,
      weekly_std_dev: 0,
      price_range_52w: { min: Math.min(...recent), max: Math.max(...recent) },
      current_vs_52w_avg: 0,
      trend: "stable" as const,
    };
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const weeklyStd = Math.sqrt(
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length
  );
  const annualizedVol = weeklyStd * Math.sqrt(52);
  const avgPrice = recent.reduce((a, b) => a + b, 0) / recent.length;
  const current = recent[recent.length - 1];

  const ma4 = recent.length >= 4 ? recent.slice(-4).reduce((a, b) => a + b, 0) / 4 : current;
  const ma13 = recent.length >= 13 ? recent.slice(-13).reduce((a, b) => a + b, 0) / 13 : current;

  let trend: "rising" | "falling" | "stable" = "stable";
  if (ma4 > ma13 * 1.02) trend = "rising";
  else if (ma4 < ma13 * 0.98) trend = "falling";

  return {
    annualized_volatility: Math.round(annualizedVol * 10000) / 10000,
    weekly_std_dev: Math.round(weeklyStd * 10000) / 10000,
    price_range_52w: {
      min: Math.round(Math.min(...recent) * 1000) / 1000,
      max: Math.round(Math.max(...recent) * 1000) / 1000,
    },
    current_vs_52w_avg: Math.round(((current - avgPrice) / avgPrice) * 100 * 100) / 100,
    trend,
  };
}
