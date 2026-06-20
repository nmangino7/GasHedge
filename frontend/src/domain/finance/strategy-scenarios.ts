// "What if gas goes to $X" modeler for an option strategy (the OptionStrat-style
// payoff tool). Ports v1's buildScenarios but replaces its
//      fuelChange = etfChange × correlation
// with the corrected beta + basis-drift model from scenarios.ts, so the option
// modeler and the outright-ETF modeler agree on how fuel tracks the ETF.
// Pure functions, no I/O.

import { StrategyResult, OptionLeg } from "./strategies";
import { fuelChangeFromEtf } from "./scenarios";

export interface StrategyScenarioPoint {
  etfPrice: number;
  impliedFuelPrice: number;
  fuelPctChange: number;
  unhedgedAnnualCost: number;
  optionPayoff: number;
  etfPayoff: number;
  hedgePayoff: number;
  hedgedAnnualCost: number;
  hedgeValue: number;
  netCostVsToday: number;
  hedgePct: number;
}

export interface StrategyScenarioResult {
  strategyKey: string;
  strategyName: string;
  ticker: string;
  spotEtfPrice: number;
  spotFuelPrice: number;
  currentAnnualFuelCost: number;
  monthlyGallons: number;
  beta: number;
  basisDriftPct: number;
  contracts: number;
  netPremium: number;
  sharesOwned: number;
  capitalRequired: number;
  points: StrategyScenarioPoint[];
  breakevenEtfPrice: number | null;
  breakevenFuelPrice: number | null;
  worstCaseHedgeValue: number;
  bestCaseHedgeValue: number;
  maxLoss: string;
  maxGain: string;
}

export interface StrategyScenarioInput {
  strategy: StrategyResult;
  monthlyGallons: number;
  currentFuelPrice: number;
  /** beta hedge ratio linking fuel to the ETF (replaces raw correlation). */
  beta: number;
  basisDriftPct?: number;
  etfPriceChanges?: number[];
}

const DEFAULT_CHANGES = [
  -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3,
  0.35, 0.4, 0.5, 0.6,
];

/** Payoff of one option leg at expiry given a spot ETF price. */
function legPayoffAtExpiry(leg: OptionLeg, spot: number): number {
  const intrinsic =
    leg.optionType === "call"
      ? Math.max(spot - leg.strike, 0)
      : Math.max(leg.strike - spot, 0);
  const sideMul = leg.side === "long" ? 1 : -1;
  return (intrinsic - leg.premiumPerShare) * sideMul * 100 * leg.contracts;
}

function strategyPayoffAtExpiry(legs: OptionLeg[], spot: number): number {
  return legs.reduce((acc, leg) => acc + legPayoffAtExpiry(leg, spot), 0);
}

export function buildStrategyScenarios(
  input: StrategyScenarioInput
): StrategyScenarioResult {
  const { strategy, monthlyGallons, currentFuelPrice, beta } = input;
  const basisDrift = input.basisDriftPct ?? 0;
  const changes = input.etfPriceChanges ?? DEFAULT_CHANGES;
  const spot = strategy.underlyingPrice;
  const currentAnnualFuelCost = monthlyGallons * 12 * currentFuelPrice;
  const sharesOwned = strategy.sharesRequired ?? 0;

  const points: StrategyScenarioPoint[] = changes.map((etfChange) => {
    const etfPrice = spot * (1 + etfChange);
    const fuelChange = fuelChangeFromEtf(etfChange, beta, basisDrift);
    const impliedFuelPrice = currentFuelPrice * (1 + fuelChange);
    const unhedgedAnnualCost = monthlyGallons * 12 * impliedFuelPrice;
    const optionPayoff = strategyPayoffAtExpiry(strategy.legs, etfPrice);
    const etfPayoff = sharesOwned * (etfPrice - spot);
    const hedgePayoff = optionPayoff + etfPayoff;
    const hedgedAnnualCost = unhedgedAnnualCost - hedgePayoff;
    const netCostVsToday = hedgedAnnualCost - currentAnnualFuelCost;
    return {
      etfPrice: round2(etfPrice),
      impliedFuelPrice: round3(impliedFuelPrice),
      fuelPctChange: round2(fuelChange * 100),
      unhedgedAnnualCost: Math.round(unhedgedAnnualCost),
      optionPayoff: Math.round(optionPayoff),
      etfPayoff: Math.round(etfPayoff),
      hedgePayoff: Math.round(hedgePayoff),
      hedgedAnnualCost: Math.round(hedgedAnnualCost),
      hedgeValue: Math.round(hedgePayoff),
      netCostVsToday: Math.round(netCostVsToday),
      hedgePct:
        unhedgedAnnualCost > 0
          ? round1((hedgePayoff / unhedgedAnnualCost) * 100)
          : 0,
    };
  });

  // Breakeven = ETF price where hedge value crosses zero (linear interpolation).
  let breakevenEtfPrice: number | null = null;
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k];
    const b = points[k + 1];
    if ((a.hedgeValue < 0 && b.hedgeValue >= 0) || (a.hedgeValue >= 0 && b.hedgeValue < 0)) {
      const ratio = Math.abs(a.hedgeValue) / (Math.abs(a.hedgeValue) + Math.abs(b.hedgeValue));
      breakevenEtfPrice = a.etfPrice + (b.etfPrice - a.etfPrice) * ratio;
      break;
    }
  }
  const breakevenFuelPrice =
    breakevenEtfPrice != null
      ? currentFuelPrice * (1 + fuelChangeFromEtf((breakevenEtfPrice - spot) / spot, beta, basisDrift))
      : null;

  const hedgeValues = points.map((p) => p.hedgeValue);

  return {
    strategyKey: strategy.strategyKey,
    strategyName: strategy.displayName,
    ticker: strategy.ticker,
    spotEtfPrice: spot,
    spotFuelPrice: currentFuelPrice,
    currentAnnualFuelCost: Math.round(currentAnnualFuelCost),
    monthlyGallons,
    beta: round4(beta),
    basisDriftPct: basisDrift,
    contracts: strategy.contracts,
    netPremium: strategy.totalPremium,
    sharesOwned,
    capitalRequired: Math.round(sharesOwned * spot + Math.max(0, strategy.totalPremium)),
    points,
    breakevenEtfPrice: breakevenEtfPrice != null ? round2(breakevenEtfPrice) : null,
    breakevenFuelPrice: breakevenFuelPrice != null ? round3(breakevenFuelPrice) : null,
    worstCaseHedgeValue: Math.round(Math.min(...hedgeValues)),
    bestCaseHedgeValue: Math.round(Math.max(...hedgeValues)),
    maxLoss: typeof strategy.maxLoss === "number" ? `$${Math.round(strategy.maxLoss).toLocaleString()}` : String(strategy.maxLoss),
    maxGain: typeof strategy.maxGain === "number" ? `$${Math.round(strategy.maxGain).toLocaleString()}` : String(strategy.maxGain),
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
