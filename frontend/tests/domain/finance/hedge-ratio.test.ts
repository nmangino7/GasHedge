import { describe, it, expect } from "vitest";
import {
  minVarianceHedgeRatio,
  sizeHedge,
  computeHedge,
} from "@/domain/finance/hedge-ratio";

describe("minimum-variance hedge ratio", () => {
  it("computes h* = ρ · σ_fuel / σ_etf (regression beta)", () => {
    const r = minVarianceHedgeRatio({ correlation: 0.88, fuelVolatility: 0.28, etfVolatility: 0.35 });
    expect(r.beta).toBeCloseTo(0.88 * (0.28 / 0.35), 10); // = 0.704
    expect(r.hedgeEffectiveness).toBeCloseTo(0.88 * 0.88, 10);
    expect(r.basisRisk).toBeCloseTo(Math.sqrt(1 - 0.88 * 0.88), 10);
  });

  it("falls back to ρ when σ_etf is degenerate (zero)", () => {
    expect(minVarianceHedgeRatio({ correlation: 0.8, fuelVolatility: 0.3, etfVolatility: 0 }).beta).toBe(0.8);
  });

  it("clamps correlation into [-1, 1]", () => {
    expect(minVarianceHedgeRatio({ correlation: 1.5, fuelVolatility: 0.3, etfVolatility: 0.3 }).hedgeEffectiveness).toBe(1);
  });
});

describe("sizeHedge — beta SCALES the notional (never divides)", () => {
  it("holds etfNotional = beta × fuelNotional", () => {
    const size = sizeHedge({
      monthlyGallons: 10_000,
      coverageRatio: 0.5,
      currentFuelPrice: 4.0,
      etfPrice: 60,
      beta: 0.5,
      expenseRatio: 0.01,
    });
    // annual gallons 120k, hedged 60k, fuel notional 240k
    expect(size.fuelNotionalHedged).toBeCloseTo(240_000, 2);
    // beta 0.5 ⇒ etf notional 120k (HALF the fuel notional — the realistic answer)
    expect(size.etfNotional).toBeCloseTo(120_000, 2);
    expect(size.sharesNeeded).toBe(2000);
    expect(size.annualExpenseDrag).toBeCloseTo(1200, 2);
  });

  it("REGRESSION (v1 bug #2): with a realistic beta < 1 you hold LESS ETF than fuel notional", () => {
    const { ratio, size } = computeHedge({
      monthlyGallons: 10_000,
      coverageRatio: 1.0,
      currentFuelPrice: 4.0,
      etfPrice: 60,
      ticker: "UGA",
      correlation: 0.88,
      fuelVolatility: 0.28,
      etfVolatility: 0.35,
    });
    expect(ratio.beta).toBeLessThan(1);
    // v1 divided by correlation (0.88) ⇒ etfNotional > fuelNotional. The fix
    // multiplies by beta (0.704) ⇒ etfNotional < fuelNotional.
    expect(size.etfNotional).toBeLessThan(size.fuelNotionalHedged);
    expect(size.etfNotional).toBeCloseTo(0.704 * size.fuelNotionalHedged, 2);
  });
});
