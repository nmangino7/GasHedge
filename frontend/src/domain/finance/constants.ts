// Static financial constants for the four fuel ETFs the platform supports.
//
// These are deliberately kept in the pure domain layer so the engine and its
// tests never reach out to the network for a "reasonable default". Live prices
// and live implied vols flow in from the services layer and override these.

export type FuelType = "gasoline" | "diesel";
export type EtfTicker = "UGA" | "USO" | "BNO" | "UNL";

export const ETF_NAMES: Record<string, string> = {
  UGA: "United States Gasoline Fund",
  USO: "United States Oil Fund",
  BNO: "United States Brent Oil Fund",
  UNL: "United States 12 Month Natural Gas Fund",
};

/** Annual fund expense ratios (decimal). */
export const EXPENSE_RATIOS: Record<string, number> = {
  UGA: 0.0097,
  USO: 0.0081,
  BNO: 0.009,
  UNL: 0.009,
};

/**
 * Historical correlation of each ETF's returns to retail fuel-price returns.
 * Used as the ρ input to the minimum-variance hedge ratio.
 */
export const CORRELATION: Record<string, Record<string, number>> = {
  gasoline: { UGA: 0.88, USO: 0.78, BNO: 0.75 },
  diesel: { USO: 0.8, BNO: 0.78, UGA: 0.65 },
};

/**
 * Default annualized implied volatility per ETF, used only when a live IV is
 * unavailable. Calibrated to typical levels for energy-commodity ETFs.
 */
export const DEFAULT_IV: Record<string, number> = {
  UGA: 0.35,
  USO: 0.32,
  BNO: 0.31,
  UNL: 0.42,
};

/** Default annualized volatility of the retail fuel itself (σ_fuel fallback). */
export const DEFAULT_FUEL_VOL: Record<FuelType, number> = {
  gasoline: 0.28,
  diesel: 0.26,
};

/** Fallback ETF prices, used only when no live/quoted price is available. */
export const DEFAULT_ETF_PRICES: Record<string, number> = {
  UGA: 58.0,
  USO: 72.0,
  BNO: 30.0,
  UNL: 8.0,
};

/** Risk-free rate — roughly current 3-month T-bill territory. */
export const DEFAULT_RISK_FREE_RATE = 0.045;

/** Days per year used for all time-to-expiry conversions. */
export const DAYS_PER_YEAR = 365.25;

/** The ETF we steer each fuel toward as the primary hedge instrument. */
export function preferredTicker(fuelType: string): EtfTicker {
  if (fuelType === "gasoline") return "UGA";
  return "USO"; // diesel and anything else proxy through WTI/USO
}

/** Look up the modeled default IV for a ticker, defaulting to 35%. */
export function getDefaultIV(ticker: string): number {
  return DEFAULT_IV[ticker.toUpperCase()] ?? 0.35;
}

/** Correlation of a (fuelType, ticker) pair, defaulting to 0.8. */
export function getCorrelation(fuelType: string, ticker: string): number {
  return CORRELATION[fuelType]?.[ticker] ?? 0.8;
}

/** Expense ratio for a ticker, defaulting to 1%. */
export function getExpenseRatio(ticker: string): number {
  return EXPENSE_RATIOS[ticker] ?? 0.01;
}

/** Fractional years between two dates (calendar, 365.25-day year). */
export function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000);
}
