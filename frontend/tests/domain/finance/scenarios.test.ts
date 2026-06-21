import { describe, it, expect } from "vitest";
import { runScenarios, fuelChangeFromEtf } from "@/domain/finance/scenarios";
import { sizeHedge } from "@/domain/finance/hedge-ratio";

const hedgeSize = sizeHedge({
  monthlyGallons: 10_000,
  coverageRatio: 0.5,
  currentFuelPrice: 4.0,
  etfPrice: 60,
  beta: 0.5,
  expenseRatio: 0.01,
  hedgeEffectiveness: 0.77,
});

const baseInputs = {
  monthlyGallons: 10_000,
  hedgeSize,
  currentFuelPrice: 4.0,
  etfPrice: 60,
  beta: 0.5,
};

describe("forward scenarios — basis-risk model", () => {
  it("derives fuel move from the ETF move via beta (+ basis), not etfChange·correlation", () => {
    expect(fuelChangeFromEtf(0.1, 0.5, 0)).toBeCloseTo(0.05, 10);
    expect(fuelChangeFromEtf(0.1, 0.5, 0.03)).toBeCloseTo(0.08, 10);

    const out = runScenarios({ ...baseInputs, etfPriceChanges: [0.1] });
    expect(out.rows[0].fuelChangePct).toBeCloseTo(0.05, 6);
    expect(out.rows[0].newFuelPrice).toBeCloseTo(4.2, 6);
  });

  it("hedge P&L is the REAL share P&L: shares × ΔetfPrice (no correlation factor)", () => {
    const out = runScenarios({ ...baseInputs, etfPriceChanges: [0.1] });
    // shares 2000, ETF 60 → 66, ΔP&L = 2000 × 6 = 12,000
    expect(out.rows[0].etfPnl).toBeCloseTo(12_000, 2);
    // savings = etfPnl − expenseDrag
    expect(out.rows[0].savings).toBeCloseTo(12_000 - hedgeSize.annualExpenseDrag, 2);
  });

  it("REGRESSION (v1 bug #2): basis drift leaves real residual exposure — the hedge is NOT perfect", () => {
    const noBasis = runScenarios({ ...baseInputs, basisDriftPct: 0, etfPriceChanges: [0.1] });
    // With beta linking fuel↔ETF and no extra drift, the covered portion is fully offset.
    expect(noBasis.rows[0].residualExposure).toBeCloseTo(0, 2);

    // Inject a fuel-only shock the ETF does not capture → residual exposure appears.
    const withBasis = runScenarios({ ...baseInputs, basisDriftPct: 0.05, etfPriceChanges: [0.1] });
    // covered cost change = gallonsHedged(60k) × Δfuel; ETF P&L unchanged → residual > 0
    expect(withBasis.rows[0].residualExposure).toBeGreaterThan(1000);
    expect(withBasis.rows[0].etfPnl).toBeCloseTo(noBasis.rows[0].etfPnl, 2); // ETF leg same
    expect(withBasis.rows[0].savings).toBeLessThan(
      withBasis.rows[0].unhedgedAnnualCost - baseInputs.monthlyGallons * 12 * baseInputs.currentFuelPrice
    );
  });

  it("breakeven is where ETF gain offsets expense drag", () => {
    const out = runScenarios(baseInputs);
    expect(out.breakeven).not.toBeNull();
    // expenseDrag / etfNotional = 1200 / 120000 = 0.01
    expect(out.breakeven!.etfChangePct).toBeCloseTo(0.01, 4);
  });
});
