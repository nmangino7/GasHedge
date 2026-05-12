// =============================================================================
// OPTIONS PAYOFF MATH — OptionStrat-style
// Two views per position:
//   1. AT-EXPIRY payoff   = intrinsic value at expiry minus entry premium paid
//   2. CURRENT-VALUE P&L  = Black-Scholes value at any time / underlying minus
//                            entry premium paid (uses live IV when supplied)
//
// All P&L is the option position only — fuel-cost framing belongs upstream.
// =============================================================================

import { blackScholes, getDefaultIV, DEFAULT_RISK_FREE_RATE } from "./black-scholes";

export interface PayoffLeg {
  side: "long" | "short";
  option_type: "call" | "put";
  strike: number;
  contracts: number;
  /** Entry premium per share */
  entry_premium_per_share: number;
  /** IV in decimal — pulled from chain when available, else default */
  iv: number;
}

/**
 * Underlying ETF / equity position attached to a strategy (for collar,
 * covered call, etc.). Optional. Shares are signed: positive = long.
 */
export interface UnderlyingPosition {
  shares: number;
  entry_price: number;
}

/**
 * Payoff at expiration (intrinsic value of each leg, net of premium paid).
 */
export function legPayoffAtExpiry(leg: PayoffLeg, spotAtExpiry: number): number {
  const intrinsic =
    leg.option_type === "call"
      ? Math.max(spotAtExpiry - leg.strike, 0)
      : Math.max(leg.strike - spotAtExpiry, 0);
  const sideMul = leg.side === "long" ? 1 : -1;
  // P&L per share = (intrinsic - entry premium) × direction
  return (intrinsic - leg.entry_premium_per_share) * sideMul * 100 * leg.contracts;
}

/**
 * Current Black-Scholes value of one leg.
 * Days remaining until expiry is the time variable.
 */
export function legCurrentValue(
  leg: PayoffLeg,
  spot: number,
  daysToExpiry: number
): number {
  if (daysToExpiry <= 0) {
    return legPayoffAtExpiry(leg, spot);
  }
  const bs = blackScholes({
    spot,
    strike: leg.strike,
    timeToExpiryYears: daysToExpiry / 365.25,
    volatility: leg.iv,
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
  });
  const currentPricePerShare = leg.option_type === "call" ? bs.callPrice : bs.putPrice;
  const sideMul = leg.side === "long" ? 1 : -1;
  return (currentPricePerShare - leg.entry_premium_per_share) * sideMul * 100 * leg.contracts;
}

/**
 * Total option-position P&L at expiry across all legs (excluding ETF).
 */
export function strategyPayoffAtExpiry(legs: PayoffLeg[], spotAtExpiry: number): number {
  return legs.reduce((acc, leg) => acc + legPayoffAtExpiry(leg, spotAtExpiry), 0);
}

/**
 * Total option-position P&L at intermediate time across all legs.
 */
export function strategyCurrentValue(
  legs: PayoffLeg[],
  spot: number,
  daysToExpiry: number
): number {
  return legs.reduce((acc, leg) => acc + legCurrentValue(leg, spot, daysToExpiry), 0);
}

/**
 * Add the ETF position P&L if present.
 */
export function totalPositionPnL(
  legs: PayoffLeg[],
  underlying: UnderlyingPosition | undefined,
  spot: number,
  daysToExpiry: number
): { option: number; etf: number; total: number } {
  const option =
    daysToExpiry <= 0
      ? strategyPayoffAtExpiry(legs, spot)
      : strategyCurrentValue(legs, spot, daysToExpiry);
  const etf = underlying ? underlying.shares * (spot - underlying.entry_price) : 0;
  return { option, etf, total: option + etf };
}

// ---------------------------------------------------------------------------
// PROBABILITY MATH
// ---------------------------------------------------------------------------

function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * y);
}

/**
 * Probability that the underlying lands above `price` at expiry, under a
 * lognormal Black-Scholes assumption. Used for risk reversals, long calls,
 * etc. — anything that profits above a threshold.
 */
export function probabilityAbove(
  spot: number,
  price: number,
  daysToExpiry: number,
  iv: number,
  riskFreeRate = DEFAULT_RISK_FREE_RATE
): number {
  if (daysToExpiry <= 0) return spot > price ? 1 : 0;
  const T = daysToExpiry / 365.25;
  const sigma = iv;
  const numerator = Math.log(spot / price) + (riskFreeRate - 0.5 * sigma * sigma) * T;
  const denominator = sigma * Math.sqrt(T);
  return normalCdf(numerator / denominator);
}

export function probabilityBelow(
  spot: number,
  price: number,
  daysToExpiry: number,
  iv: number,
  riskFreeRate = DEFAULT_RISK_FREE_RATE
): number {
  return 1 - probabilityAbove(spot, price, daysToExpiry, iv, riskFreeRate);
}

/**
 * Probability of profit: sample the at-expiry payoff curve across a wide
 * range and integrate the probability mass over the profitable region.
 */
export function probabilityOfProfit(params: {
  legs: PayoffLeg[];
  underlying?: UnderlyingPosition;
  spot: number;
  daysToExpiry: number;
  iv: number;
}): number {
  const { legs, underlying, spot, daysToExpiry, iv } = params;
  if (daysToExpiry <= 0) return 0;
  // Sweep underlying from -50% to +200% in 1% steps for fine resolution.
  let total = 0;
  let profitable = 0;
  let lastPrice = spot * 0.5;
  for (let pct = -0.5; pct <= 2.0; pct += 0.01) {
    const price = spot * (1 + pct);
    const optPnl = strategyPayoffAtExpiry(legs, price);
    const etfPnl = underlying ? underlying.shares * (price - underlying.entry_price) : 0;
    const totalPnL = optPnl + etfPnl;
    // Approximate density via probability mass in the 1% window from lastPrice → price
    const massInWindow = Math.abs(
      probabilityAbove(spot, lastPrice, daysToExpiry, iv) -
        probabilityAbove(spot, price, daysToExpiry, iv)
    );
    if (totalPnL > 0) profitable += massInWindow;
    total += massInWindow;
    lastPrice = price;
  }
  return total > 0 ? profitable / total : 0;
}

/**
 * Find break-even underlying prices (where total P&L crosses zero).
 * Returns sorted list of crossing points.
 */
export function findBreakevens(params: {
  legs: PayoffLeg[];
  underlying?: UnderlyingPosition;
  spot: number;
}): number[] {
  const { legs, underlying, spot } = params;
  const points: number[] = [];
  let lastPrice = spot * 0.4;
  let lastPnL = computePnLAtExpiry(legs, underlying, lastPrice);
  for (let pct = 0.4; pct <= 2.5; pct += 0.005) {
    const price = spot * pct;
    const pnl = computePnLAtExpiry(legs, underlying, price);
    if ((lastPnL < 0 && pnl >= 0) || (lastPnL >= 0 && pnl < 0)) {
      // Linear interpolation
      const ratio = Math.abs(lastPnL) / (Math.abs(lastPnL) + Math.abs(pnl));
      const breakeven = lastPrice + (price - lastPrice) * ratio;
      points.push(Math.round(breakeven * 100) / 100);
    }
    lastPrice = price;
    lastPnL = pnl;
  }
  return points;
}

function computePnLAtExpiry(
  legs: PayoffLeg[],
  underlying: UnderlyingPosition | undefined,
  price: number
): number {
  const optPnl = strategyPayoffAtExpiry(legs, price);
  const etfPnl = underlying ? underlying.shares * (price - underlying.entry_price) : 0;
  return optPnl + etfPnl;
}

// ---------------------------------------------------------------------------
// AGGREGATE GREEKS
// ---------------------------------------------------------------------------

export interface AggregateGreeks {
  delta: number;
  gamma: number;
  theta: number; // per calendar day
  vega: number; // per 1% IV move
}

export function aggregateGreeks(
  legs: PayoffLeg[],
  underlying: UnderlyingPosition | undefined,
  spot: number,
  daysToExpiry: number
): AggregateGreeks {
  if (daysToExpiry <= 0) {
    return {
      delta: underlying?.shares ?? 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    };
  }
  const T = daysToExpiry / 365.25;
  let delta = 0;
  let gamma = 0;
  let theta = 0;
  let vega = 0;
  for (const leg of legs) {
    const bs = blackScholes({
      spot,
      strike: leg.strike,
      timeToExpiryYears: T,
      volatility: leg.iv,
      riskFreeRate: DEFAULT_RISK_FREE_RATE,
    });
    const positionUnits = 100 * leg.contracts * (leg.side === "long" ? 1 : -1);
    delta += (leg.option_type === "call" ? bs.callDelta : bs.putDelta) * positionUnits;
    gamma += bs.gamma * positionUnits;
    theta += (leg.option_type === "call" ? bs.callTheta : bs.putTheta) * positionUnits;
    vega += bs.vega * positionUnits;
  }
  if (underlying) {
    delta += underlying.shares;
  }
  return {
    delta: Math.round(delta),
    gamma: Math.round(gamma * 100) / 100,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// PRICE GRID — sample underlying prices for payoff diagram
// ---------------------------------------------------------------------------

export function buildPriceGrid(spot: number, range = 0.5, steps = 60): number[] {
  const min = spot * (1 - range);
  const max = spot * (1 + range);
  const step = (max - min) / steps;
  const grid: number[] = [];
  for (let i = 0; i <= steps; i++) grid.push(Math.round((min + i * step) * 100) / 100);
  return grid;
}

// ---------------------------------------------------------------------------
// FULL PAYOFF GRID — for OptionStrat-style multi-time-slice chart
// ---------------------------------------------------------------------------

export interface PayoffGridRow {
  underlying_price: number;
  /** P&L today (at current time, all time premium intact) */
  pnl_today: number;
  /** P&L halfway between today and expiry */
  pnl_mid: number;
  /** P&L at expiration */
  pnl_expiry: number;
  /** Implied retail fuel price at this ETF price (for context) */
  implied_fuel_price?: number;
}

export interface PayoffGridResult {
  rows: PayoffGridRow[];
  breakevens: number[];
  max_profit: number;
  max_loss: number;
  spot: number;
  days_to_expiry: number;
  iv_used: number;
  pop: number;
  greeks: AggregateGreeks;
  underlying_shares: number;
  underlying_value: number;
}

export function buildPayoffGrid(params: {
  legs: PayoffLeg[];
  underlying?: UnderlyingPosition;
  spot: number;
  daysToExpiry: number;
  iv: number;
  currentFuelPrice?: number;
  correlation?: number;
  range?: number;
  steps?: number;
}): PayoffGridResult {
  const {
    legs,
    underlying,
    spot,
    daysToExpiry,
    iv,
    currentFuelPrice,
    correlation = 0.85,
    range = 0.5,
    steps = 60,
  } = params;

  const prices = buildPriceGrid(spot, range, steps);
  const midDays = daysToExpiry / 2;
  const rows: PayoffGridRow[] = prices.map((price) => {
    const optToday = strategyCurrentValue(legs, price, daysToExpiry);
    const optMid = strategyCurrentValue(legs, price, midDays);
    const optExpiry = strategyPayoffAtExpiry(legs, price);
    const etfPnl = underlying ? underlying.shares * (price - underlying.entry_price) : 0;
    const fuelPctChange = ((price - spot) / spot) * correlation;
    const impliedFuel = currentFuelPrice ? currentFuelPrice * (1 + fuelPctChange) : undefined;
    return {
      underlying_price: price,
      pnl_today: Math.round(optToday + etfPnl),
      pnl_mid: Math.round(optMid + etfPnl),
      pnl_expiry: Math.round(optExpiry + etfPnl),
      implied_fuel_price: impliedFuel ? Math.round(impliedFuel * 1000) / 1000 : undefined,
    };
  });

  const breakevens = findBreakevens({ legs, underlying, spot });
  const max_profit = Math.max(...rows.map((r) => r.pnl_expiry));
  const max_loss = Math.min(...rows.map((r) => r.pnl_expiry));
  const pop = probabilityOfProfit({ legs, underlying, spot, daysToExpiry, iv });
  const greeks = aggregateGreeks(legs, underlying, spot, daysToExpiry);

  return {
    rows,
    breakevens,
    max_profit: Math.round(max_profit),
    max_loss: Math.round(max_loss),
    spot,
    days_to_expiry: daysToExpiry,
    iv_used: iv,
    pop: Math.round(pop * 1000) / 10, // percent with 1 decimal
    greeks,
    underlying_shares: underlying?.shares ?? 0,
    underlying_value: underlying ? underlying.shares * underlying.entry_price : 0,
  };
}

export { getDefaultIV };
