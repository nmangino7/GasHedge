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

export function detailedScenarioAnalysis(
  monthlyGallons: number,
  hedgePosition: ReturnType<typeof calculateHedgePosition>,
  currentFuelPrice: number
) {
  // 19 price points from -30% to +60% in 5% increments
  const changes = Array.from({ length: 19 }, (_, i) => Math.round((-0.3 + i * 0.05) * 100) / 100);
  const scenarios = scenarioAnalysis(monthlyGallons, hedgePosition, currentFuelPrice, changes);

  // Calculate exact breakeven: the price change where savings = 0
  // Savings formula: savings = hedgePnl - expenseCost
  // hedgePnl = notional * change * correlation
  // At breakeven: notional * change * correlation = expenseCost
  // change = expenseCost / (notional * correlation)
  const breakevenChange = hedgePosition.annual_expense_cost /
    (hedgePosition.dollar_notional * hedgePosition.correlation_to_retail);
  const breakevenPrice = Math.round(currentFuelPrice * (1 + breakevenChange) * 1000) / 1000;

  // Monthly projections at current price (no change scenario)
  const monthlyGallonsVal = monthlyGallons;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthlyProjections = months.map((name) => {
    const unhedged = monthlyGallonsVal * currentFuelPrice;
    const hedgeCostPerMonth = hedgePosition.annual_expense_cost / 12;
    const hedgedSavingsPerMonth = 0; // At current price, ETF PnL = 0
    const hedged = unhedged + hedgeCostPerMonth - hedgedSavingsPerMonth;
    return {
      month: name,
      unhedged_cost: Math.round(unhedged * 100) / 100,
      hedged_cost: Math.round(hedged * 100) / 100,
      savings: Math.round((unhedged - hedged) * 100) / 100,
    };
  });

  return {
    scenarios,
    breakeven: {
      price_change_pct: Math.round(breakevenChange * 10000) / 10000,
      fuel_price_per_gallon: breakevenPrice,
      description: `Hedging becomes profitable when fuel prices rise more than ${(breakevenChange * 100).toFixed(1)}% above current levels ($${breakevenPrice}/gal)`,
    },
    monthly_projections: monthlyProjections,
    annual_summary: {
      current_annual_cost: Math.round(monthlyGallons * 12 * currentFuelPrice * 100) / 100,
      hedge_annual_expense: hedgePosition.annual_expense_cost,
      gallons_hedged: hedgePosition.gallons_hedged,
      effective_coverage: hedgePosition.effective_hedge_ratio,
    },
  };
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

// --- Options Strategy ---
// Call options on fuel futures (RBOB gasoline or ULSD diesel)
export function calculateOptionsStrategy(
  monthlyGallons: number,
  fuelType: string,
  currentFuelPrice: number,
  hedgeRatio: number = 0.5
) {
  const annualGallons = monthlyGallons * 12;
  const gallonsToHedge = annualGallons * hedgeRatio;
  const contractSize = 42000; // Standard futures contract = 42,000 gallons
  const contractsNeeded = Math.max(1, Math.round(gallonsToHedge / contractSize));
  const actualGallonsHedged = contractsNeeded * contractSize;

  // Option premium estimate: ~5-8% of notional for 6-month at-the-money call
  const notionalPerContract = contractSize * currentFuelPrice;
  const premiumRate = 0.065; // ~6.5% of notional
  const premiumPerContract = notionalPerContract * premiumRate;
  const totalPremium = premiumPerContract * contractsNeeded;

  const strikePrice = currentFuelPrice; // At-the-money
  const breakevenPrice = currentFuelPrice * (1 + premiumRate);

  return {
    approach: "options" as const,
    contracts_needed: contractsNeeded,
    contract_size_gallons: contractSize,
    total_premium: Math.round(totalPremium),
    max_loss: Math.round(totalPremium), // Max loss = premium paid
    breakeven_price: Math.round(breakevenPrice * 1000) / 1000,
    strike_price: Math.round(strikePrice * 1000) / 1000,
    expiry_months: 6,
    license_required: "Series 3" as const,
    description: `Buy ${contractsNeeded} ${fuelType === "diesel" ? "ULSD" : "RBOB"} call option contracts at $${strikePrice.toFixed(3)} strike. Total premium: $${totalPremium.toLocaleString()}. Max downside is the premium paid. Profitable when ${fuelType} exceeds $${breakevenPrice.toFixed(3)}/gal.`,
  };
}

// --- Futures Strategy ---
// Direct futures hedging (RBOB gasoline or ULSD diesel)
export function calculateFuturesStrategy(
  monthlyGallons: number,
  fuelType: string,
  currentFuelPrice: number,
  hedgeRatio: number = 0.5
) {
  const annualGallons = monthlyGallons * 12;
  const gallonsToHedge = annualGallons * hedgeRatio;
  const contractSize = 42000;
  const contractsNeeded = Math.max(1, Math.round(gallonsToHedge / contractSize));

  const notionalValue = contractsNeeded * contractSize * currentFuelPrice;
  // Margin requirement: ~10% of notional for energy futures
  const marginPerContract = Math.round(contractSize * currentFuelPrice * 0.10);
  const totalMargin = marginPerContract * contractsNeeded;

  const futuresCorrelation = fuelType === "diesel" ? 0.95 : 0.92; // Futures have higher correlation than ETFs

  return {
    approach: "futures" as const,
    contracts_needed: contractsNeeded,
    contract_size_gallons: contractSize,
    margin_per_contract: marginPerContract,
    total_margin_required: totalMargin,
    notional_value: Math.round(notionalValue),
    correlation: futuresCorrelation,
    license_required: "Series 3" as const,
    description: `Buy ${contractsNeeded} ${fuelType === "diesel" ? "ULSD" : "RBOB"} futures contracts. Margin required: $${totalMargin.toLocaleString()} (${contractsNeeded} × $${marginPerContract.toLocaleString()}). ${(futuresCorrelation * 100).toFixed(0)}% correlation to retail ${fuelType}. Strongest hedge but requires active management and Series 3 license.`,
  };
}

// --- Compare All Strategies ---
export function compareAllStrategies(
  monthlyGallons: number,
  fuelType: string,
  currentFuelPrice: number,
  etfPrices: Record<string, number>,
  hedgeRatio: number = 0.5
) {
  const etfStrategies = recommendStrategy(fuelType, monthlyGallons, currentFuelPrice, etfPrices);
  const moderateETF = etfStrategies.find(s => s.tier === "moderate") || etfStrategies[1];
  const options = calculateOptionsStrategy(monthlyGallons, fuelType, currentFuelPrice, hedgeRatio);
  const futures = calculateFuturesStrategy(monthlyGallons, fuelType, currentFuelPrice, hedgeRatio);

  const comparison = [
    {
      approach: "ETF",
      annual_cost: moderateETF.position.annual_expense_cost,
      upfront_capital: moderateETF.position.dollar_notional,
      max_loss: "Unlimited (ETF can lose value)",
      correlation: `${(moderateETF.position.correlation_to_retail * 100).toFixed(0)}%`,
      liquidity: "High — sell anytime during market hours",
      complexity: "Low",
      license: "Series 65/66 (advisory)",
      best_for: "Most small businesses, simplest approach",
    },
    {
      approach: "Options",
      annual_cost: options.total_premium,
      upfront_capital: options.total_premium,
      max_loss: `$${options.max_loss.toLocaleString()} (premium only)`,
      correlation: "90-95% (direct fuel futures)",
      liquidity: "Moderate — exchange-traded",
      complexity: "Medium",
      license: "Series 3 required",
      best_for: "Cost-conscious hedgers who want capped downside",
    },
    {
      approach: "Futures",
      annual_cost: 0,
      upfront_capital: futures.total_margin_required,
      max_loss: "Unlimited (margin calls possible)",
      correlation: `${(futures.correlation * 100).toFixed(0)}%`,
      liquidity: "High — exchange-traded",
      complexity: "High",
      license: "Series 3 required",
      best_for: "Large fleets with sophisticated management",
    },
  ];

  return {
    etf: etfStrategies,
    options,
    futures,
    comparison,
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

// =============================================================================
// ETF OPTIONS STRATEGIES (Series 65/66 advisory — client executes via broker)
// =============================================================================

import {
  blackScholes,
  getDefaultIV,
  DEFAULT_RISK_FREE_RATE,
  yearsBetween,
} from "./black-scholes";

export type EtfOptionType = "call" | "put";
export type EtfOptionSide = "long" | "short";

export type EtfOptionStrategyKey =
  | "long_call"
  | "long_put"
  | "covered_call"
  | "short_put"
  | "collar";

export interface EtfOptionStrategyInput {
  monthlyGallons: number;
  fuelType: string;
  currentFuelPrice: number;
  ticker: string;
  etfPrice: number;
  hedgeRatio?: number;
  daysToExpiry?: number;
  strikeMoneyness?: number; // 1.0 = ATM, 1.05 = 5% OTM call, 0.95 = 5% OTM put
  impliedVol?: number;
}

export interface EtfOptionLeg {
  side: EtfOptionSide;
  option_type: EtfOptionType;
  strike: number;
  premium_per_share: number; // dollars per share (each contract = 100 shares)
  contracts: number;
  delta: number;
  gamma: number;
  theta_per_day: number;
  vega: number;
  iv_used: number;
}

export interface EtfOptionStrategyResult {
  strategy_key: EtfOptionStrategyKey;
  display_name: string;
  ticker: string;
  expiry_days: number;
  underlying_price: number;
  contracts: number;
  total_premium: number; // positive = debit (you pay), negative = credit (you receive)
  total_premium_label: string;
  max_loss: number | "Unlimited" | "ETF can fall to $0";
  max_gain: number | "Unlimited";
  breakeven_etf_price: number | null;
  net_delta: number;
  hedge_fit: number; // 0–1 score of how well this matches a fuel-cost hedge use case
  shares_required?: number; // for covered call / collar that requires holding ETF
  cash_required?: number; // for short put cash collateral
  legs: EtfOptionLeg[];
  description: string;
  best_for: string;
  rationale: string;
}

const ETF_FULL_NAMES: Record<string, string> = {
  UGA: "United States Gasoline Fund",
  USO: "United States Oil Fund",
  BNO: "United States Brent Oil Fund",
  UNL: "United States 12 Month Natural Gas Fund",
};

function preferredTicker(fuelType: string): string {
  if (fuelType === "gasoline") return "UGA";
  if (fuelType === "diesel") return "USO";
  return "USO";
}

function notionalContractsForHedge(
  monthlyGallons: number,
  fuelType: string,
  currentFuelPrice: number,
  hedgeRatio: number,
  ticker: string,
  etfPrice: number
): number {
  const annualGallons = monthlyGallons * 12;
  const gallonsToHedge = annualGallons * hedgeRatio;
  const correlation = (CORRELATION[fuelType] || {})[ticker] || 0.8;
  const annualFuelCost = gallonsToHedge * currentFuelPrice;
  const adjustedNotional = annualFuelCost / correlation;
  const sharesNeeded = etfPrice > 0 ? adjustedNotional / etfPrice : 0;
  return Math.max(1, Math.round(sharesNeeded / 100));
}

function pricesAt(
  spot: number,
  strike: number,
  iv: number,
  daysToExpiry: number
) {
  return blackScholes({
    spot,
    strike,
    timeToExpiryYears: daysToExpiry / 365.25,
    volatility: iv,
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
  });
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export function calculateEtfLongCall(
  input: EtfOptionStrategyInput
): EtfOptionStrategyResult {
  const {
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    ticker,
    etfPrice,
    hedgeRatio = 0.5,
    daysToExpiry = 120,
    strikeMoneyness = 1.0,
    impliedVol,
  } = input;

  const iv = impliedVol ?? getDefaultIV(ticker);
  const strike = round2(etfPrice * strikeMoneyness);
  const contracts = notionalContractsForHedge(
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    hedgeRatio,
    ticker,
    etfPrice
  );
  const bs = pricesAt(etfPrice, strike, iv, daysToExpiry);
  const premiumPerShare = bs.callPrice;
  const totalPremium = premiumPerShare * 100 * contracts;
  const breakeven = strike + premiumPerShare;

  return {
    strategy_key: "long_call",
    display_name: "Long Call (Upside Protection)",
    ticker,
    expiry_days: daysToExpiry,
    underlying_price: etfPrice,
    contracts,
    total_premium: round2(totalPremium),
    total_premium_label: `$${Math.round(totalPremium).toLocaleString()} debit`,
    max_loss: round2(totalPremium),
    max_gain: "Unlimited",
    breakeven_etf_price: round2(breakeven),
    net_delta: round4(bs.callDelta * contracts * 100),
    hedge_fit: 0.95,
    legs: [
      {
        side: "long",
        option_type: "call",
        strike,
        premium_per_share: round2(premiumPerShare),
        contracts,
        delta: round4(bs.callDelta),
        gamma: round4(bs.gamma),
        theta_per_day: round4(bs.callTheta),
        vega: round4(bs.vega),
        iv_used: iv,
      },
    ],
    description: `Buy ${contracts} ${ticker} $${strike.toFixed(2)} call contract${contracts === 1 ? "" : "s"} expiring in ~${daysToExpiry} days. Pays $${Math.round(totalPremium).toLocaleString()} premium up front. Profits dollar-for-dollar above $${breakeven.toFixed(2)}. Maximum loss is the premium paid if ${ticker} stays below $${strike.toFixed(2)} at expiry.`,
    best_for:
      "Small fleets that want upside protection against a fuel-price spike with strictly capped downside.",
    rationale: `${ETF_FULL_NAMES[ticker] || ticker} closely tracks ${fuelType} prices. Owning calls means if ${fuelType} spikes, ${ticker} rises, and the call's intrinsic value offsets your higher fuel bill. Premium cost is the insurance premium — fully predictable.`,
  };
}

export function calculateEtfLongPut(
  input: EtfOptionStrategyInput
): EtfOptionStrategyResult {
  const {
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    ticker,
    etfPrice,
    hedgeRatio = 0.5,
    daysToExpiry = 120,
    strikeMoneyness = 1.0,
    impliedVol,
  } = input;

  const iv = impliedVol ?? getDefaultIV(ticker);
  const strike = round2(etfPrice * strikeMoneyness);
  const contracts = notionalContractsForHedge(
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    hedgeRatio,
    ticker,
    etfPrice
  );
  const bs = pricesAt(etfPrice, strike, iv, daysToExpiry);
  const premiumPerShare = bs.putPrice;
  const totalPremium = premiumPerShare * 100 * contracts;
  const breakeven = strike - premiumPerShare;

  return {
    strategy_key: "long_put",
    display_name: "Long Put (Downside Protection on ETF)",
    ticker,
    expiry_days: daysToExpiry,
    underlying_price: etfPrice,
    contracts,
    total_premium: round2(totalPremium),
    total_premium_label: `$${Math.round(totalPremium).toLocaleString()} debit`,
    max_loss: round2(totalPremium),
    max_gain: round2(strike * 100 * contracts - totalPremium),
    breakeven_etf_price: round2(breakeven),
    net_delta: round4(bs.putDelta * contracts * 100),
    hedge_fit: 0.25,
    legs: [
      {
        side: "long",
        option_type: "put",
        strike,
        premium_per_share: round2(premiumPerShare),
        contracts,
        delta: round4(bs.putDelta),
        gamma: round4(bs.gamma),
        theta_per_day: round4(bs.putTheta),
        vega: round4(bs.vega),
        iv_used: iv,
      },
    ],
    description: `Buy ${contracts} ${ticker} $${strike.toFixed(2)} put contract${contracts === 1 ? "" : "s"} expiring in ~${daysToExpiry} days. Pays $${Math.round(totalPremium).toLocaleString()} premium. Profits below $${breakeven.toFixed(2)}.`,
    best_for:
      "Clients who already hold the ETF and want downside protection without selling.",
    rationale:
      "A long put isn't a fuel hedge in itself — it protects an existing ETF position from a fuel-price drop. Useful as an overlay if a client owns UGA/USO outright and is worried about a near-term reversal.",
  };
}

export function calculateEtfCoveredCall(
  input: EtfOptionStrategyInput
): EtfOptionStrategyResult {
  const {
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    ticker,
    etfPrice,
    hedgeRatio = 0.5,
    daysToExpiry = 45,
    strikeMoneyness = 1.05,
    impliedVol,
  } = input;

  const iv = impliedVol ?? getDefaultIV(ticker);
  const strike = round2(etfPrice * strikeMoneyness);
  const contracts = notionalContractsForHedge(
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    hedgeRatio,
    ticker,
    etfPrice
  );
  const sharesRequired = contracts * 100;
  const bs = pricesAt(etfPrice, strike, iv, daysToExpiry);
  const premiumPerShare = bs.callPrice;
  const credit = premiumPerShare * sharesRequired;

  return {
    strategy_key: "covered_call",
    display_name: "Covered Call (Income on ETF Holding)",
    ticker,
    expiry_days: daysToExpiry,
    underlying_price: etfPrice,
    contracts,
    total_premium: -round2(credit),
    total_premium_label: `$${Math.round(credit).toLocaleString()} credit`,
    max_loss: "ETF can fall to $0",
    max_gain: round2((strike - etfPrice) * sharesRequired + credit),
    breakeven_etf_price: round2(etfPrice - premiumPerShare),
    net_delta: round4((1 - bs.callDelta) * sharesRequired),
    hedge_fit: 0.55,
    shares_required: sharesRequired,
    legs: [
      {
        side: "short",
        option_type: "call",
        strike,
        premium_per_share: round2(premiumPerShare),
        contracts,
        delta: round4(-bs.callDelta),
        gamma: round4(-bs.gamma),
        theta_per_day: round4(-bs.callTheta),
        vega: round4(-bs.vega),
        iv_used: iv,
      },
    ],
    description: `Own ${sharesRequired.toLocaleString()} shares of ${ticker} (≈$${Math.round(etfPrice * sharesRequired).toLocaleString()}) and sell ${contracts} $${strike.toFixed(2)} call contract${contracts === 1 ? "" : "s"} expiring in ~${daysToExpiry} days. Collects $${Math.round(credit).toLocaleString()} premium. Upside capped at $${strike.toFixed(2)} — gives up gains above strike in exchange for income.`,
    best_for:
      "Clients holding the ETF as a hedge who want supplemental income and are willing to cap upside.",
    rationale:
      "Layered on top of an outright ETF position, covered calls turn a static hedge into one that generates monthly premium. Useful when fuel prices look range-bound. Repeat monthly for compounding income.",
  };
}

export function calculateEtfShortPut(
  input: EtfOptionStrategyInput
): EtfOptionStrategyResult {
  const {
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    ticker,
    etfPrice,
    hedgeRatio = 0.5,
    daysToExpiry = 45,
    strikeMoneyness = 0.95,
    impliedVol,
  } = input;

  const iv = impliedVol ?? getDefaultIV(ticker);
  const strike = round2(etfPrice * strikeMoneyness);
  const contracts = notionalContractsForHedge(
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    hedgeRatio,
    ticker,
    etfPrice
  );
  const bs = pricesAt(etfPrice, strike, iv, daysToExpiry);
  const premiumPerShare = bs.putPrice;
  const credit = premiumPerShare * 100 * contracts;
  const cashRequired = strike * 100 * contracts;

  return {
    strategy_key: "short_put",
    display_name: "Cash-Secured Short Put (Acquire ETF Cheaper)",
    ticker,
    expiry_days: daysToExpiry,
    underlying_price: etfPrice,
    contracts,
    total_premium: -round2(credit),
    total_premium_label: `$${Math.round(credit).toLocaleString()} credit`,
    max_loss: round2(strike * 100 * contracts - credit),
    max_gain: round2(credit),
    breakeven_etf_price: round2(strike - premiumPerShare),
    net_delta: round4(-bs.putDelta * contracts * 100),
    hedge_fit: 0.4,
    cash_required: round2(cashRequired),
    legs: [
      {
        side: "short",
        option_type: "put",
        strike,
        premium_per_share: round2(premiumPerShare),
        contracts,
        delta: round4(-bs.putDelta),
        gamma: round4(-bs.gamma),
        theta_per_day: round4(-bs.putTheta),
        vega: round4(-bs.vega),
        iv_used: iv,
      },
    ],
    description: `Sell ${contracts} ${ticker} $${strike.toFixed(2)} put contract${contracts === 1 ? "" : "s"} expiring in ~${daysToExpiry} days. Collects $${Math.round(credit).toLocaleString()} premium up front. Cash collateral required: $${Math.round(cashRequired).toLocaleString()}. If ${ticker} closes below $${strike.toFixed(2)} at expiry, you buy 100 shares per contract at $${strike.toFixed(2)} — effective entry price after credit is $${(strike - premiumPerShare).toFixed(2)}.`,
    best_for:
      "Clients who plan to build a long-term ETF hedge position and want to get paid to wait for a pullback.",
    rationale:
      "If you want to be long the ETF anyway, selling cash-secured puts pays you to set a buy limit order below the market. If assigned, you start the hedge at a lower basis. If not assigned, you keep the premium.",
  };
}

export function calculateEtfCollar(
  input: EtfOptionStrategyInput
): EtfOptionStrategyResult {
  const {
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    ticker,
    etfPrice,
    hedgeRatio = 0.5,
    daysToExpiry = 90,
    impliedVol,
  } = input;

  const iv = impliedVol ?? getDefaultIV(ticker);
  const callStrike = round2(etfPrice * 1.08);
  const putStrike = round2(etfPrice * 0.92);
  const contracts = notionalContractsForHedge(
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    hedgeRatio,
    ticker,
    etfPrice
  );
  const sharesRequired = contracts * 100;
  const bsCall = pricesAt(etfPrice, callStrike, iv, daysToExpiry);
  const bsPut = pricesAt(etfPrice, putStrike, iv, daysToExpiry);
  const callCredit = bsCall.callPrice * sharesRequired;
  const putDebit = bsPut.putPrice * sharesRequired;
  const netDebit = putDebit - callCredit;

  return {
    strategy_key: "collar",
    display_name: "Collar (Bracket the ETF: Floor + Ceiling)",
    ticker,
    expiry_days: daysToExpiry,
    underlying_price: etfPrice,
    contracts,
    total_premium: round2(netDebit),
    total_premium_label:
      netDebit >= 0
        ? `$${Math.round(netDebit).toLocaleString()} net debit`
        : `$${Math.round(-netDebit).toLocaleString()} net credit`,
    max_loss: round2((etfPrice - putStrike) * sharesRequired + netDebit),
    max_gain: round2((callStrike - etfPrice) * sharesRequired - netDebit),
    breakeven_etf_price: round2(etfPrice + netDebit / sharesRequired),
    net_delta: round4(
      sharesRequired + (-bsCall.callDelta * sharesRequired) + bsPut.putDelta * sharesRequired
    ),
    hedge_fit: 0.75,
    shares_required: sharesRequired,
    legs: [
      {
        side: "long",
        option_type: "put",
        strike: putStrike,
        premium_per_share: round2(bsPut.putPrice),
        contracts,
        delta: round4(bsPut.putDelta),
        gamma: round4(bsPut.gamma),
        theta_per_day: round4(bsPut.putTheta),
        vega: round4(bsPut.vega),
        iv_used: iv,
      },
      {
        side: "short",
        option_type: "call",
        strike: callStrike,
        premium_per_share: round2(bsCall.callPrice),
        contracts,
        delta: round4(-bsCall.callDelta),
        gamma: round4(-bsCall.gamma),
        theta_per_day: round4(-bsCall.callTheta),
        vega: round4(-bsCall.vega),
        iv_used: iv,
      },
    ],
    description: `Own ${sharesRequired.toLocaleString()} shares of ${ticker}. Buy ${contracts} $${putStrike.toFixed(2)} put${contracts === 1 ? "" : "s"} for downside floor + sell ${contracts} $${callStrike.toFixed(2)} call${contracts === 1 ? "" : "s"} to finance the put. Net ${netDebit >= 0 ? "cost" : "credit"}: $${Math.round(Math.abs(netDebit)).toLocaleString()}. ETF locked between $${putStrike.toFixed(2)} (floor) and $${callStrike.toFixed(2)} (ceiling) until expiry.`,
    best_for:
      "Clients who own the ETF and want bracketed exposure — limited downside, capped upside, near-zero cost.",
    rationale:
      "A collar gives a client a known worst-case fuel-cost hedge: the put guarantees the ETF can't fall below the floor, while the short call finances most or all of the put cost. Most popular hedge structure for risk-averse small business owners.",
  };
}

export function recommendEtfOptionsStrategies(
  monthlyGallons: number,
  fuelType: string,
  currentFuelPrice: number,
  etfPrices: Record<string, number>,
  hedgeRatio: number = 0.5
): EtfOptionStrategyResult[] {
  const ticker = preferredTicker(fuelType);
  const etfPrice = etfPrices[ticker] ?? 50;
  const baseInput: EtfOptionStrategyInput = {
    monthlyGallons,
    fuelType,
    currentFuelPrice,
    ticker,
    etfPrice,
    hedgeRatio,
  };

  return [
    calculateEtfLongCall({ ...baseInput, daysToExpiry: 120, strikeMoneyness: 1.0 }),
    calculateEtfCollar({ ...baseInput, daysToExpiry: 90 }),
    calculateEtfCoveredCall({ ...baseInput, daysToExpiry: 45, strikeMoneyness: 1.05 }),
    calculateEtfShortPut({ ...baseInput, daysToExpiry: 45, strikeMoneyness: 0.95 }),
    calculateEtfLongPut({ ...baseInput, daysToExpiry: 120, strikeMoneyness: 1.0 }),
  ];
}

// Live position valuation — used by /tracker page
export interface OptionPositionLiveValue {
  current_underlying_price: number;
  current_option_price_per_share: number;
  current_total_value: number; // signed: positive if long, negative if short obligation
  unrealized_pnl: number; // current_value - entry_cost, signed for long/short
  unrealized_pnl_pct: number;
  days_to_expiry: number;
  delta: number;
  intrinsic_value_per_share: number;
  time_value_per_share: number;
  iv_used: number;
}

export function valueOptionPosition(params: {
  ticker: string;
  option_type: EtfOptionType;
  side: EtfOptionSide;
  strike: number;
  expiry: Date;
  contracts: number;
  entry_premium_per_share: number;
  current_underlying_price: number;
  iv?: number;
  now?: Date;
}): OptionPositionLiveValue {
  const {
    option_type,
    side,
    strike,
    expiry,
    contracts,
    entry_premium_per_share,
    current_underlying_price,
    iv,
    now = new Date(),
  } = params;
  const years = Math.max(0, yearsBetween(now, expiry));
  const days = Math.round(years * 365.25);
  const ivUsed = iv ?? getDefaultIV(params.ticker);
  const bs = blackScholes({
    spot: current_underlying_price,
    strike,
    timeToExpiryYears: years,
    volatility: ivUsed,
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
  });
  const currentPricePerShare =
    option_type === "call" ? bs.callPrice : bs.putPrice;
  const intrinsic =
    option_type === "call"
      ? Math.max(current_underlying_price - strike, 0)
      : Math.max(strike - current_underlying_price, 0);
  const timeValue = Math.max(0, currentPricePerShare - intrinsic);
  const sideMul = side === "long" ? 1 : -1;
  const entryCost = entry_premium_per_share * 100 * contracts * sideMul;
  const currentValue = currentPricePerShare * 100 * contracts * sideMul;
  const pnl = currentValue - entryCost;
  const pnlPct =
    Math.abs(entryCost) > 0 ? (pnl / Math.abs(entryCost)) * 100 : 0;
  const delta =
    option_type === "call" ? bs.callDelta * sideMul : bs.putDelta * sideMul;

  return {
    current_underlying_price: round2(current_underlying_price),
    current_option_price_per_share: round2(currentPricePerShare),
    current_total_value: round2(currentValue),
    unrealized_pnl: round2(pnl),
    unrealized_pnl_pct: round2(pnlPct),
    days_to_expiry: days,
    delta: round4(delta * contracts * 100),
    intrinsic_value_per_share: round2(intrinsic),
    time_value_per_share: round2(timeValue),
    iv_used: ivUsed,
  };
}
