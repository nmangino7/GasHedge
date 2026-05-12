// =============================================================================
// OPTIONS SCENARIO MODELER
// Sweeps the underlying ETF price across a range and computes, per scenario:
// implied retail fuel price, unhedged annual fuel cost, option payoff at expiry,
// hedged annual cost, and net savings vs unhedged-at-spot.
//
// This is the "what if gas goes to $X" tool the advisor uses with a client.
// =============================================================================

import type { EtfOptionStrategyResult, EtfOptionLeg } from "./hedging-engine";

export interface ScenarioPoint {
  /** Underlying ETF price at expiry */
  etf_price: number;
  /** Implied retail fuel price (current_retail × etf_change × correlation) */
  implied_fuel_price: number;
  /** % change in fuel from current */
  fuel_pct_change: number;
  /** Unhedged annual fuel cost AT THIS scenario (= gallons × scenario_price × 12) */
  unhedged_annual_cost: number;
  /** P&L on the option legs alone at expiry (already net of premium paid) */
  option_payoff: number;
  /** P&L on the underlying ETF position (zero for option-only strategies) */
  etf_payoff: number;
  /** Total hedge P&L = option_payoff + etf_payoff */
  hedge_payoff: number;
  /** Hedged annual cost AT THIS scenario = unhedged - hedge_payoff */
  hedged_annual_cost: number;
  /** Value of the hedge AT THIS scenario = unhedged - hedged = hedge_payoff.
   *  This is the intuitive "how much did the hedge save me?" number. */
  hedge_value: number;
  /** Net cost change vs TODAY's bill = hedged - current_annual_fuel_cost.
   *  Negative = the client pays less than today. Positive = pays more. */
  net_cost_vs_today: number;
  /** % savings vs unhedged at this scenario */
  hedge_pct: number;
}

export interface ScenarioResult {
  strategy_key: string;
  strategy_name: string;
  ticker: string;
  spot_etf_price: number;
  spot_fuel_price: number;
  current_annual_fuel_cost: number;
  monthly_gallons: number;
  correlation: number;
  contracts: number;
  net_premium: number; // signed: positive = debit, negative = credit
  /** How many ETF shares the strategy assumes the client holds (0 for option-only) */
  shares_owned: number;
  /** Total capital required = option premium + ETF shares cost */
  capital_required: number;
  scenarios: ScenarioPoint[];
  /** Breakeven ETF price (where savings cross from negative to positive) */
  breakeven_etf_price: number | null;
  /** Breakeven retail fuel price */
  breakeven_fuel_price: number | null;
  /** Worst-case hedge value — most-negative (hedge cost when bet doesn't pay off) */
  worst_case_savings: number;
  /** Best-case hedge value — most-positive (hedge fully kicks in) */
  best_case_savings: number;
  /** Strategy max-loss exposure */
  max_loss: string;
  /** Strategy max-gain exposure */
  max_gain: string;
}

/**
 * Compute the payoff of an option leg at expiry given a spot ETF price.
 * Long: intrinsic - entry_premium. Short: entry_premium - intrinsic.
 */
function legPayoffAtExpiry(leg: EtfOptionLeg, spotAtExpiry: number): number {
  const intrinsic =
    leg.option_type === "call"
      ? Math.max(spotAtExpiry - leg.strike, 0)
      : Math.max(leg.strike - spotAtExpiry, 0);
  const perShareEntry = leg.premium_per_share;
  const sideMul = leg.side === "long" ? 1 : -1;
  // Profit per share = (intrinsic - entry) * direction
  const perSharePnl = (intrinsic - perShareEntry) * sideMul;
  return perSharePnl * 100 * leg.contracts;
}

/**
 * Compute the total option position payoff at expiry across all legs.
 */
function strategyPayoffAtExpiry(legs: EtfOptionLeg[], spotAtExpiry: number): number {
  return legs.reduce((acc, leg) => acc + legPayoffAtExpiry(leg, spotAtExpiry), 0);
}

export interface ScenarioInput {
  strategy: EtfOptionStrategyResult;
  monthlyGallons: number;
  currentFuelPrice: number;
  /** ETF → retail fuel price correlation, e.g. 0.88 for UGA */
  correlation: number;
  /** ETF price changes to sweep. Default: -30% to +60% in 5% steps */
  priceChanges?: number[];
}

export function buildScenarios(input: ScenarioInput): ScenarioResult {
  const {
    strategy,
    monthlyGallons,
    currentFuelPrice,
    correlation,
    priceChanges = [
      -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3,
      0.35, 0.4, 0.5, 0.6,
    ],
  } = input;
  const spot = strategy.underlying_price;
  const currentAnnualFuelCost = monthlyGallons * 12 * currentFuelPrice;

  // Strategies that require the client to own the ETF as the base hedge.
  // For those, the scenario must include the ETF position's mark-to-market
  // P&L on top of the option legs — otherwise the hedge looks backwards
  // (e.g. a collar without the long-ETF leg appears to lose money when
  // fuel rises, which is the opposite of how the hedge actually works).
  const sharesOwned = strategy.shares_required ?? 0;

  const scenarios: ScenarioPoint[] = priceChanges.map((etfChange) => {
    const etfPrice = spot * (1 + etfChange);
    const fuelChange = etfChange * correlation;
    const impliedFuelPrice = currentFuelPrice * (1 + fuelChange);
    const unhedgedAnnualCost = monthlyGallons * 12 * impliedFuelPrice;
    const optionPayoff = strategyPayoffAtExpiry(strategy.legs, etfPrice);
    const etfPayoff = sharesOwned * (etfPrice - spot);
    const hedgePayoff = optionPayoff + etfPayoff;
    const hedgedAnnualCost = unhedgedAnnualCost - hedgePayoff;
    const hedgeValue = hedgePayoff;
    const netCostVsToday = hedgedAnnualCost - currentAnnualFuelCost;
    const hedgePct =
      unhedgedAnnualCost > 0 ? (hedgeValue / unhedgedAnnualCost) * 100 : 0;

    return {
      etf_price: Math.round(etfPrice * 100) / 100,
      implied_fuel_price: Math.round(impliedFuelPrice * 1000) / 1000,
      fuel_pct_change: Math.round(fuelChange * 10000) / 100,
      unhedged_annual_cost: Math.round(unhedgedAnnualCost),
      option_payoff: Math.round(optionPayoff),
      etf_payoff: Math.round(etfPayoff),
      hedge_payoff: Math.round(hedgePayoff),
      hedged_annual_cost: Math.round(hedgedAnnualCost),
      hedge_value: Math.round(hedgeValue),
      net_cost_vs_today: Math.round(netCostVsToday),
      hedge_pct: Math.round(hedgePct * 10) / 10,
    };
  });

  // Breakeven = the ETF price where the HEDGE VALUE flips from negative to
  // positive. For long-call-style hedges this is roughly strike + premium.
  let breakevenEtfPrice: number | null = null;
  for (let i = 0; i < scenarios.length - 1; i++) {
    if (
      (scenarios[i].hedge_value < 0 && scenarios[i + 1].hedge_value >= 0) ||
      (scenarios[i].hedge_value >= 0 && scenarios[i + 1].hedge_value < 0)
    ) {
      const a = scenarios[i];
      const b = scenarios[i + 1];
      const ratio =
        Math.abs(a.hedge_value) /
        (Math.abs(a.hedge_value) + Math.abs(b.hedge_value));
      breakevenEtfPrice = a.etf_price + (b.etf_price - a.etf_price) * ratio;
      break;
    }
  }
  const breakevenFuelPrice = breakevenEtfPrice
    ? currentFuelPrice * (1 + ((breakevenEtfPrice - spot) / spot) * correlation)
    : null;

  // Worst-case = most-negative hedge value (hedge cost when fuel falls / hedge bet wrong)
  // Best-case = most-positive hedge value (hedge fully kicks in)
  const worst = Math.min(...scenarios.map((s) => s.hedge_value));
  const best = Math.max(...scenarios.map((s) => s.hedge_value));

  return {
    strategy_key: strategy.strategy_key,
    strategy_name: strategy.display_name,
    ticker: strategy.ticker,
    spot_etf_price: spot,
    spot_fuel_price: currentFuelPrice,
    current_annual_fuel_cost: Math.round(currentAnnualFuelCost),
    monthly_gallons: monthlyGallons,
    correlation,
    contracts: strategy.contracts,
    net_premium: strategy.total_premium,
    shares_owned: sharesOwned,
    capital_required: Math.round(sharesOwned * spot + Math.max(0, strategy.total_premium)),
    scenarios,
    breakeven_etf_price: breakevenEtfPrice ? Math.round(breakevenEtfPrice * 100) / 100 : null,
    breakeven_fuel_price: breakevenFuelPrice ? Math.round(breakevenFuelPrice * 1000) / 1000 : null,
    worst_case_savings: Math.round(worst),
    best_case_savings: Math.round(best),
    max_loss:
      typeof strategy.max_loss === "number"
        ? `$${Math.round(strategy.max_loss).toLocaleString()}`
        : String(strategy.max_loss),
    max_gain:
      typeof strategy.max_gain === "number"
        ? `$${Math.round(strategy.max_gain).toLocaleString()}`
        : String(strategy.max_gain),
  };
}
