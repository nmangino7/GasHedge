// Black-Scholes-Merton option pricing (with a continuous dividend/cost-of-carry
// yield). Pure functions, no I/O.
//
// The formulas here are the textbook ones and were verified against the
// existing implementation, which is correct; the rewrite's contribution is to
// pin them with reference-value and put-call-parity tests (see
// tests/domain/finance/black-scholes.test.ts).

import { normalCdf } from "./normal";

export interface BlackScholesInputs {
  /** Underlying (ETF) spot price. */
  spot: number;
  /** Option strike. */
  strike: number;
  /** Time to expiry, in years. */
  timeToExpiryYears: number;
  /** Annualized volatility (decimal, e.g. 0.35 == 35%). */
  volatility: number;
  /** Annualized continuously-compounded risk-free rate (decimal). */
  riskFreeRate: number;
  /** Continuous dividend / carry yield (decimal). Defaults to 0. */
  dividendYield?: number;
}

export interface D1D2 {
  d1: number;
  d2: number;
  /** σ·√T — cached because callers reuse it for Greeks. */
  sigmaSqrtT: number;
}

/** Compute the d1/d2 terms. Assumes timeToExpiryYears > 0. */
export function d1d2(i: BlackScholesInputs): D1D2 {
  const { spot, strike, timeToExpiryYears, volatility, riskFreeRate } = i;
  const dividendYield = i.dividendYield ?? 0;
  const sigmaSqrtT = volatility * Math.sqrt(timeToExpiryYears);
  const d1 =
    (Math.log(spot / strike) +
      (riskFreeRate - dividendYield + 0.5 * volatility * volatility) *
        timeToExpiryYears) /
    sigmaSqrtT;
  const d2 = d1 - sigmaSqrtT;
  return { d1, d2, sigmaSqrtT };
}

/** Black-Scholes call price. Falls back to intrinsic value at/after expiry. */
export function callPrice(i: BlackScholesInputs): number {
  if (i.timeToExpiryYears <= 0) return Math.max(i.spot - i.strike, 0);
  const dividendYield = i.dividendYield ?? 0;
  const { d1, d2 } = d1d2(i);
  const discountStrike = i.strike * Math.exp(-i.riskFreeRate * i.timeToExpiryYears);
  const discountSpot = i.spot * Math.exp(-dividendYield * i.timeToExpiryYears);
  return discountSpot * normalCdf(d1) - discountStrike * normalCdf(d2);
}

/** Black-Scholes put price. Falls back to intrinsic value at/after expiry. */
export function putPrice(i: BlackScholesInputs): number {
  if (i.timeToExpiryYears <= 0) return Math.max(i.strike - i.spot, 0);
  const dividendYield = i.dividendYield ?? 0;
  const { d1, d2 } = d1d2(i);
  const discountStrike = i.strike * Math.exp(-i.riskFreeRate * i.timeToExpiryYears);
  const discountSpot = i.spot * Math.exp(-dividendYield * i.timeToExpiryYears);
  return discountStrike * normalCdf(-d2) - discountSpot * normalCdf(-d1);
}
