// Standard normal CDF using Abramowitz & Stegun 26.2.17 approximation.
// Accurate to ~7e-8 — plenty for an advisory pricing tool.
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

function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BlackScholesInputs {
  spot: number;
  strike: number;
  timeToExpiryYears: number;
  volatility: number;
  riskFreeRate: number;
  dividendYield?: number;
}

export interface BlackScholesResult {
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

export function blackScholes({
  spot,
  strike,
  timeToExpiryYears,
  volatility,
  riskFreeRate,
  dividendYield = 0,
}: BlackScholesInputs): BlackScholesResult {
  if (timeToExpiryYears <= 0) {
    const intrinsicCall = Math.max(spot - strike, 0);
    const intrinsicPut = Math.max(strike - spot, 0);
    return {
      callPrice: intrinsicCall,
      putPrice: intrinsicPut,
      callDelta: spot > strike ? 1 : 0,
      putDelta: spot < strike ? -1 : 0,
      gamma: 0,
      vega: 0,
      callTheta: 0,
      putTheta: 0,
      d1: 0,
      d2: 0,
    };
  }

  const sigmaSqrtT = volatility * Math.sqrt(timeToExpiryYears);
  const d1 =
    (Math.log(spot / strike) +
      (riskFreeRate - dividendYield + 0.5 * volatility * volatility) *
        timeToExpiryYears) /
    sigmaSqrtT;
  const d2 = d1 - sigmaSqrtT;

  const discountStrike = strike * Math.exp(-riskFreeRate * timeToExpiryYears);
  const discountSpot = spot * Math.exp(-dividendYield * timeToExpiryYears);

  const callPrice = discountSpot * normalCdf(d1) - discountStrike * normalCdf(d2);
  const putPrice =
    discountStrike * normalCdf(-d2) - discountSpot * normalCdf(-d1);

  const callDelta = Math.exp(-dividendYield * timeToExpiryYears) * normalCdf(d1);
  const putDelta = callDelta - Math.exp(-dividendYield * timeToExpiryYears);
  const gamma =
    (Math.exp(-dividendYield * timeToExpiryYears) * normalPdf(d1)) /
    (spot * sigmaSqrtT);
  // Vega per 1% change in vol (divide by 100)
  const vega =
    (spot *
      Math.exp(-dividendYield * timeToExpiryYears) *
      normalPdf(d1) *
      Math.sqrt(timeToExpiryYears)) /
    100;
  // Theta per calendar day (divide by 365)
  const callTheta =
    (-(
      (spot * normalPdf(d1) * volatility * Math.exp(-dividendYield * timeToExpiryYears)) /
      (2 * Math.sqrt(timeToExpiryYears))
    ) -
      riskFreeRate * discountStrike * normalCdf(d2) +
      dividendYield * discountSpot * normalCdf(d1)) /
    365;
  const putTheta =
    (-(
      (spot * normalPdf(d1) * volatility * Math.exp(-dividendYield * timeToExpiryYears)) /
      (2 * Math.sqrt(timeToExpiryYears))
    ) +
      riskFreeRate * discountStrike * normalCdf(-d2) -
      dividendYield * discountSpot * normalCdf(-d1)) /
    365;

  return {
    callPrice,
    putPrice,
    callDelta,
    putDelta,
    gamma,
    vega,
    callTheta,
    putTheta,
    d1,
    d2,
  };
}

// Default implied vol assumptions per fuel ETF (annualized).
// Calibrated to typical levels for energy commodity ETFs in normal markets.
export const DEFAULT_IV: Record<string, number> = {
  UGA: 0.35,
  USO: 0.32,
  BNO: 0.31,
  UNL: 0.42,
};

// Default risk-free rate (current 3-month T-bill territory)
export const DEFAULT_RISK_FREE_RATE = 0.045;

export function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

export function getDefaultIV(ticker: string): number {
  return DEFAULT_IV[ticker.toUpperCase()] ?? 0.35;
}
