export const CORRELATION: Record<string, Record<string, number>> = {
  gasoline: { UGA: 0.88, USO: 0.78, BNO: 0.75 },
  diesel: { USO: 0.8, BNO: 0.78, UGA: 0.65 },
};

const EXPENSE_RATIOS: Record<string, number> = {
  UGA: 0.0097,
  USO: 0.0081,
  BNO: 0.009,
  UNL: 0.009,
};

const ETF_NAMES: Record<string, string> = {
  UGA: "United States Gasoline Fund",
  USO: "United States Oil Fund",
  BNO: "United States Brent Oil Fund",
  UNL: "United States 12 Month Natural Gas Fund",
};

export const DEFAULT_ETF_PRICES: Record<string, number> = {
  UGA: 58.0,
  USO: 72.0,
  BNO: 30.0,
  UNL: 8.0,
};

export function calculateHedgePosition(
  monthlyGallons: number,
  fuelType: string,
  productTicker: string,
  hedgeRatio: number,
  currentFuelPrice: number,
  currentEtfPrice: number
) {
  const annualGallons = monthlyGallons * 12;
  const gallonsToHedge = annualGallons * hedgeRatio;
  const annualFuelCost = gallonsToHedge * currentFuelPrice;

  const correlation = (CORRELATION[fuelType] || {})[productTicker] || 0.8;
  const adjustedNotional = annualFuelCost / correlation;
  const sharesNeeded =
    currentEtfPrice > 0 ? adjustedNotional / currentEtfPrice : 0;

  const expenseRatio = EXPENSE_RATIOS[productTicker] || 0.01;
  const annualExpenseDrag = adjustedNotional * expenseRatio;

  return {
    product_ticker: productTicker,
    product_name: ETF_NAMES[productTicker] || productTicker,
    hedge_ratio: hedgeRatio,
    gallons_hedged: gallonsToHedge,
    dollar_notional: Math.round(adjustedNotional * 100) / 100,
    shares_needed: Math.round(sharesNeeded),
    annual_expense_cost: Math.round(annualExpenseDrag * 100) / 100,
    correlation_to_retail: correlation,
    effective_hedge_ratio:
      Math.round(hedgeRatio * correlation * 1000) / 1000,
    etf_price: currentEtfPrice,
  };
}

export function scenarioAnalysis(
  monthlyGallons: number,
  hedgePosition: ReturnType<typeof calculateHedgePosition>,
  currentFuelPrice: number,
  priceChanges?: number[]
) {
  const changes = priceChanges || [-0.2, -0.1, 0.0, 0.1, 0.2, 0.4, 0.6];
  const annualGallons = monthlyGallons * 12;

  return changes.map((change) => {
    const newPrice = currentFuelPrice * (1 + change);
    const unhedgedCost = annualGallons * newPrice;

    const etfReturn = change * hedgePosition.correlation_to_retail;
    const hedgePnl = hedgePosition.dollar_notional * etfReturn;
    const hedgedCost =
      unhedgedCost - hedgePnl + hedgePosition.annual_expense_cost;
    const savings = unhedgedCost - hedgedCost;

    return {
      price_change_pct: change,
      new_price_per_gallon: Math.round(newPrice * 1000) / 1000,
      unhedged_annual_cost: Math.round(unhedgedCost * 100) / 100,
      hedged_annual_cost: Math.round(hedgedCost * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savings_pct:
        unhedgedCost > 0
          ? Math.round((savings / unhedgedCost) * 100 * 100) / 100
          : 0,
    };
  });
}

export function recommendStrategy(
  fuelType: string,
  monthlyGallons: number,
  currentFuelPrice: number,
  currentEtfPrices: Record<string, number>
) {
  let primaryTicker: string;
  if (fuelType === "gasoline") {
    primaryTicker = "UGA";
  } else if (fuelType === "diesel") {
    primaryTicker = "USO";
  } else {
    primaryTicker = "USO";
  }

  const tiers = [
    {
      tier: "conservative",
      ratio: 0.25,
      ticker: primaryTicker,
      rationale:
        "Covers 25% of fuel consumption. Lowest cost, still provides meaningful protection against large price spikes. Best for companies with thin margins wanting basic protection.",
    },
    {
      tier: "moderate",
      ratio: 0.5,
      ticker: primaryTicker,
      rationale:
        "Covers 50% of fuel consumption. Balanced approach — significant protection while keeping half of your fuel budget flexible. Most popular choice for small businesses.",
    },
    {
      tier: "aggressive",
      ratio: 0.75,
      ticker: primaryTicker,
      rationale:
        "Covers 75% of fuel consumption. Maximum protection with higher cost. Best for businesses where fuel is a very large portion of operating expenses.",
    },
  ];

  return tiers.map((t) => {
    const etfPrice = currentEtfPrices[t.ticker] || 50.0;
    const position = calculateHedgePosition(
      monthlyGallons,
      fuelType,
      t.ticker,
      t.ratio,
      currentFuelPrice,
      etfPrice
    );
    return {
      tier: t.tier,
      product_ticker: t.ticker,
      product_name: ETF_NAMES[t.ticker] || t.ticker,
      hedge_ratio: t.ratio,
      position,
      rationale: t.rationale,
    };
  });
}

export function calculateExposure(
  monthlyGallonsGasoline: number,
  monthlyGallonsDiesel: number,
  currentPriceGasoline: number,
  currentPriceDiesel: number,
  annualRevenue?: number | null
) {
  const monthlyGasCost = monthlyGallonsGasoline * currentPriceGasoline;
  const monthlyDieselCost = monthlyGallonsDiesel * currentPriceDiesel;
  const monthlyFuelCost = monthlyGasCost + monthlyDieselCost;
  const annualFuelCost = monthlyFuelCost * 12;

  let fuelPct: number | null = null;
  if (annualRevenue && annualRevenue > 0) {
    fuelPct = Math.round((annualFuelCost / annualRevenue) * 100 * 100) / 100;
  }

  const scenarios = [0.1, 0.2, 0.4, 0.6].map((changePct) => {
    const shockedGas = currentPriceGasoline * (1 + changePct);
    const shockedDiesel = currentPriceDiesel * (1 + changePct);
    const shockedMonthly =
      monthlyGallonsGasoline * shockedGas +
      monthlyGallonsDiesel * shockedDiesel;
    const shockedAnnual = shockedMonthly * 12;
    const additional = shockedAnnual - annualFuelCost;
    return {
      price_change_pct: changePct,
      label: `+${Math.round(changePct * 100)}%`,
      monthly_cost: Math.round(shockedMonthly * 100) / 100,
      annual_cost: Math.round(shockedAnnual * 100) / 100,
      additional_annual_cost: Math.round(additional * 100) / 100,
    };
  });

  return {
    monthly_gallons_gasoline: monthlyGallonsGasoline,
    monthly_gallons_diesel: monthlyGallonsDiesel,
    current_price_gasoline:
      Math.round(currentPriceGasoline * 1000) / 1000,
    current_price_diesel: Math.round(currentPriceDiesel * 1000) / 1000,
    monthly_fuel_cost: Math.round(monthlyFuelCost * 100) / 100,
    annual_fuel_cost: Math.round(annualFuelCost * 100) / 100,
    fuel_pct_revenue: fuelPct,
    scenarios,
  };
}

export function historicalBacktest(
  monthlyGallons: number,
  fuelPrices: { period: string; value: number }[],
  etfPrices: { period: string; value: number }[],
  hedgeRatio: number,
  correlation: number
) {
  if (!fuelPrices.length || !etfPrices.length) {
    return {
      periods: [],
      total_unhedged_cost: 0,
      total_hedged_cost: 0,
      total_savings: 0,
      savings_pct: 0,
    };
  }

  const fuelMap = new Map(fuelPrices.map((p) => [p.period, p.value]));
  const etfMap = new Map(etfPrices.map((p) => [p.period, p.value]));

  const commonDates = [...new Set([...fuelMap.keys()].filter((d) => etfMap.has(d)))].sort();

  if (commonDates.length < 2) {
    return {
      periods: [],
      total_unhedged_cost: 0,
      total_hedged_cost: 0,
      total_savings: 0,
      savings_pct: 0,
    };
  }

  const weeklyGallons = monthlyGallons / 4.33;
  const gallonsHedged = weeklyGallons * hedgeRatio;

  const periods: {
    date: string;
    fuel_price: number;
    etf_price: number;
    unhedged_cost: number;
    hedged_cost: number;
    period_savings: number;
    cumulative_savings: number;
  }[] = [];
  let totalUnhedged = 0;
  let totalHedged = 0;
  let cumulativeSavings = 0;

  for (let i = 1; i < commonDates.length; i++) {
    const d = commonDates[i];
    const prevD = commonDates[i - 1];
    const fuelPrice = fuelMap.get(d)!;
    const etfPrice = etfMap.get(d)!;
    const prevEtf = etfMap.get(prevD)!;

    const unhedgedCost = weeklyGallons * fuelPrice;
    const etfReturn = prevEtf > 0 ? (etfPrice - prevEtf) / prevEtf : 0;
    const hedgePnl =
      gallonsHedged * fuelMap.get(commonDates[0])! * correlation * etfReturn;
    const hedgedCost = unhedgedCost - hedgePnl;
    const savings = unhedgedCost - hedgedCost;
    cumulativeSavings += savings;

    totalUnhedged += unhedgedCost;
    totalHedged += hedgedCost;

    periods.push({
      date: d,
      fuel_price: Math.round(fuelPrice * 1000) / 1000,
      etf_price: Math.round(etfPrice * 100) / 100,
      unhedged_cost: Math.round(unhedgedCost * 100) / 100,
      hedged_cost: Math.round(hedgedCost * 100) / 100,
      period_savings: Math.round(savings * 100) / 100,
      cumulative_savings: Math.round(cumulativeSavings * 100) / 100,
    });
  }

  const totalSavings = totalUnhedged - totalHedged;
  const savingsPct =
    totalUnhedged > 0 ? (totalSavings / totalUnhedged) * 100 : 0;

  return {
    periods,
    total_unhedged_cost: Math.round(totalUnhedged * 100) / 100,
    total_hedged_cost: Math.round(totalHedged * 100) / 100,
    total_savings: Math.round(totalSavings * 100) / 100,
    savings_pct: Math.round(savingsPct * 100) / 100,
    period_count: periods.length,
    start_date: commonDates[0],
    end_date: commonDates[commonDates.length - 1],
  };
}

export function calculateDealRevenue(
  feeStructure: string,
  feeAmount: number,
  aumValue?: number | null
): number {
  if (feeStructure === "flat") return feeAmount;
  if (feeStructure === "aum_percentage")
    return (aumValue || 0) * (feeAmount / 100);
  if (feeStructure === "subscription") return feeAmount * 12;
  return 0;
}
