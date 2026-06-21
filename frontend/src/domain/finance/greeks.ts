// Option Greeks and a combined price+Greeks convenience.
//
// Conventions (preserved from the original engine so downstream numbers match):
//   - vega  is quoted per 1 percentage-point change in volatility (÷100)
//   - theta is quoted per calendar day (÷365)
// Pure functions, no I/O.

import { normalCdf, normalPdf } from "./normal";
import { BlackScholesInputs, callPrice, putPrice, d1d2 } from "./black-scholes";

export interface Greeks {
  delta: number;
  gamma: number;
  /** Per 1 percentage-point of volatility. */
  vega: number;
  /** Per calendar day. */
  theta: number;
}

const DAYS_PER_YEAR_THETA = 365;
const VEGA_SCALE = 100;

function carry(i: BlackScholesInputs): number {
  return Math.exp(-(i.dividendYield ?? 0) * i.timeToExpiryYears);
}

/** Gamma and vega are identical for calls and puts. */
function sharedGreeks(i: BlackScholesInputs, d1: number, sigmaSqrtT: number) {
  const q = carry(i);
  const gamma = (q * normalPdf(d1)) / (i.spot * sigmaSqrtT);
  const vega =
    (i.spot * q * normalPdf(d1) * Math.sqrt(i.timeToExpiryYears)) / VEGA_SCALE;
  return { gamma, vega };
}

export function callGreeks(i: BlackScholesInputs): Greeks {
  if (i.timeToExpiryYears <= 0) {
    return { delta: i.spot > i.strike ? 1 : 0, gamma: 0, vega: 0, theta: 0 };
  }
  const dividendYield = i.dividendYield ?? 0;
  const { d1, d2, sigmaSqrtT } = d1d2(i);
  const q = carry(i);
  const { gamma, vega } = sharedGreeks(i, d1, sigmaSqrtT);
  const discountStrike =
    i.strike * Math.exp(-i.riskFreeRate * i.timeToExpiryYears);
  const discountSpot = i.spot * q;
  const delta = q * normalCdf(d1);
  const theta =
    (-(
      (i.spot * normalPdf(d1) * i.volatility * q) /
      (2 * Math.sqrt(i.timeToExpiryYears))
    ) -
      i.riskFreeRate * discountStrike * normalCdf(d2) +
      dividendYield * discountSpot * normalCdf(d1)) /
    DAYS_PER_YEAR_THETA;
  return { delta, gamma, vega, theta };
}

export function putGreeks(i: BlackScholesInputs): Greeks {
  if (i.timeToExpiryYears <= 0) {
    return { delta: i.spot < i.strike ? -1 : 0, gamma: 0, vega: 0, theta: 0 };
  }
  const dividendYield = i.dividendYield ?? 0;
  const { d1, d2, sigmaSqrtT } = d1d2(i);
  const q = carry(i);
  const { gamma, vega } = sharedGreeks(i, d1, sigmaSqrtT);
  const discountStrike =
    i.strike * Math.exp(-i.riskFreeRate * i.timeToExpiryYears);
  const discountSpot = i.spot * q;
  // putDelta = callDelta - e^{-qT}
  const delta = q * normalCdf(d1) - q;
  const theta =
    (-(
      (i.spot * normalPdf(d1) * i.volatility * q) /
      (2 * Math.sqrt(i.timeToExpiryYears))
    ) +
      i.riskFreeRate * discountStrike * normalCdf(-d2) -
      dividendYield * discountSpot * normalCdf(-d1)) /
    DAYS_PER_YEAR_THETA;
  return { delta, gamma, vega, theta };
}

export interface PriceAndGreeks {
  callPrice: number;
  putPrice: number;
  callDelta: number;
  putDelta: number;
  gamma: number;
  vega: number;
  callTheta: number;
  putTheta: number;
  d1: number;
  d2: number;
}

/**
 * Combined price + Greeks in a single call — the workhorse used by the strategy
 * builders and the live position valuer. Equivalent to the original
 * `blackScholes()` return shape.
 */
export function priceAndGreeks(i: BlackScholesInputs): PriceAndGreeks {
  if (i.timeToExpiryYears <= 0) {
    return {
      callPrice: Math.max(i.spot - i.strike, 0),
      putPrice: Math.max(i.strike - i.spot, 0),
      callDelta: i.spot > i.strike ? 1 : 0,
      putDelta: i.spot < i.strike ? -1 : 0,
      gamma: 0,
      vega: 0,
      callTheta: 0,
      putTheta: 0,
      d1: 0,
      d2: 0,
    };
  }
  const { d1, d2 } = d1d2(i);
  const cg = callGreeks(i);
  const pg = putGreeks(i);
  return {
    callPrice: callPrice(i),
    putPrice: putPrice(i),
    callDelta: cg.delta,
    putDelta: pg.delta,
    gamma: cg.gamma,
    vega: cg.vega,
    callTheta: cg.theta,
    putTheta: pg.theta,
    d1,
    d2,
  };
}
