// Hedge sizing — the corrected core of the platform.
//
// THE BUG WE ARE FIXING (v1):
//   v1 sized the hedge as  etfNotional = fuelNotional / correlation  and then,
//   in the scenario table, modeled the ETF return as  etfReturn = fuelChange ×
//   correlation. Multiplying those two together makes `correlation` cancel
//   exactly, so every scenario silently assumed a PERFECT, zero-basis-risk
//   hedge — and dividing by ρ (a number < 1) actually held MORE ETF notional
//   than fuel notional, the opposite of reality.
//
// THE FIX:
//   Size with the textbook minimum-variance (regression-beta) hedge ratio
//       h* = ρ · (σ_fuel / σ_etf)
//   This is the OLS slope of fuel returns on ETF returns: the ETF notional that
//   minimizes the variance of the hedged fuel cost. Because retail fuel is
//   stickier and less volatile than the futures-tracking ETF, σ_fuel/σ_etf < 1,
//   so h* is typically well below 1 — you hold LESS ETF notional than fuel
//   notional, which is the realistic answer. Crucially, h* multiplies (it never
//   divides), so correlation no longer cancels in the scenario engine and basis
//   risk becomes visible.
//
// Pure functions, no I/O.

import { getExpenseRatio } from "./constants";

export interface HedgeRatioInputs {
  /** ρ — correlation of fuel returns to ETF returns, in [-1, 1]. */
  correlation: number;
  /** σ_fuel — annualized volatility of the retail fuel price. */
  fuelVolatility: number;
  /** σ_etf — annualized volatility of the hedging ETF. */
  etfVolatility: number;
}

export interface HedgeRatioResult {
  /** h* = ρ · σ_fuel / σ_etf — the minimum-variance hedge ratio (regression beta). */
  beta: number;
  /** ρ² — fraction of fuel-cost variance the hedge removes. */
  hedgeEffectiveness: number;
  /** √(1 − ρ²) — residual (basis) risk that remains after hedging. */
  basisRisk: number;
}

/**
 * Minimum-variance hedge ratio and its quality metrics.
 *
 * If σ_etf is non-positive (degenerate / missing data) beta falls back to ρ so
 * the result stays finite and conservative.
 */
export function minVarianceHedgeRatio(i: HedgeRatioInputs): HedgeRatioResult {
  const rho = clamp(i.correlation, -1, 1);
  const beta =
    i.etfVolatility > 0 ? rho * (i.fuelVolatility / i.etfVolatility) : rho;
  const r2 = rho * rho;
  return {
    beta,
    hedgeEffectiveness: r2,
    basisRisk: Math.sqrt(Math.max(0, 1 - r2)),
  };
}

export interface HedgeSizeInputs {
  monthlyGallons: number;
  /** Policy choice: fraction of consumption to cover (0.25 / 0.5 / 0.75). */
  coverageRatio: number;
  currentFuelPrice: number;
  etfPrice: number;
  /** h* from minVarianceHedgeRatio. */
  beta: number;
  /** Fund expense ratio (decimal). */
  expenseRatio: number;
  /** ρ² carried through for UI transparency. */
  hedgeEffectiveness?: number;
}

export interface HedgeSize {
  gallonsHedged: number;
  /** The fuel exposure being covered (gallonsHedged × fuelPrice, annualized). */
  fuelNotionalHedged: number;
  /** ETF notional held = beta × fuelNotional. beta SCALES; it never divides. */
  etfNotional: number;
  sharesNeeded: number;
  annualExpenseDrag: number;
  hedgeEffectiveness: number;
}

/** Size the ETF hedge for a given coverage policy using the beta hedge ratio. */
export function sizeHedge(i: HedgeSizeInputs): HedgeSize {
  const annualGallons = i.monthlyGallons * 12;
  const gallonsHedged = annualGallons * i.coverageRatio;
  const fuelNotionalHedged = gallonsHedged * i.currentFuelPrice;
  const etfNotional = i.beta * fuelNotionalHedged;
  const sharesNeeded = i.etfPrice > 0 ? etfNotional / i.etfPrice : 0;
  const annualExpenseDrag = etfNotional * i.expenseRatio;
  return {
    gallonsHedged,
    fuelNotionalHedged: round2(fuelNotionalHedged),
    etfNotional: round2(etfNotional),
    sharesNeeded: Math.round(sharesNeeded),
    annualExpenseDrag: round2(annualExpenseDrag),
    hedgeEffectiveness: i.hedgeEffectiveness ?? 0,
  };
}

/** Number of option contracts (100 shares each) matching a hedge's share count. */
export function contractsForHedge(size: HedgeSize): number {
  return Math.max(1, Math.round(size.sharesNeeded / 100));
}

export interface FullHedgeSizeInputs {
  monthlyGallons: number;
  coverageRatio: number;
  currentFuelPrice: number;
  etfPrice: number;
  ticker: string;
  correlation: number;
  fuelVolatility: number;
  etfVolatility: number;
}

/** Convenience: compute the hedge ratio and size in one call. */
export function computeHedge(i: FullHedgeSizeInputs): {
  ratio: HedgeRatioResult;
  size: HedgeSize;
} {
  const ratio = minVarianceHedgeRatio({
    correlation: i.correlation,
    fuelVolatility: i.fuelVolatility,
    etfVolatility: i.etfVolatility,
  });
  const size = sizeHedge({
    monthlyGallons: i.monthlyGallons,
    coverageRatio: i.coverageRatio,
    currentFuelPrice: i.currentFuelPrice,
    etfPrice: i.etfPrice,
    beta: ratio.beta,
    expenseRatio: getExpenseRatio(i.ticker),
    hedgeEffectiveness: ratio.hedgeEffectiveness,
  });
  return { ratio, size };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
