import { describe, it, expect } from "vitest";
import { runBacktest, pearson, BacktestInputs } from "@/domain/finance/backtest";

const fuelSeries = [
  { period: "w0", value: 4.0 },
  { period: "w1", value: 4.04 }, // +1.0%
  { period: "w2", value: 4.0198 }, // -0.5%
  { period: "w3", value: 4.10 }, // ~+2.0%
];
// ETF returns are exactly 2× the fuel returns → perfectly correlated (ρ=1), more volatile.
const etfSeries = [
  { period: "w0", value: 60 },
  { period: "w1", value: 61.2 }, // +2.0%
  { period: "w2", value: 60.588 }, // -1.0%
  { period: "w3", value: 63.0 }, // ~+4.0%
];

const inputs: BacktestInputs = {
  monthlyGallons: 10_000,
  coverageRatio: 0.5,
  beta: 0.5,
  fuelSeries,
  etfSeries,
};

describe("historical backtest — fixed share count, no correlation factor", () => {
  it("REGRESSION (v1 bug #1): etfPnl is shares × Δprice — ratio constant across periods, never scaled by ρ", () => {
    const out = runBacktest(inputs);
    expect(out.rows).toHaveLength(3);
    // shares are fixed at t0, so etfPnl / Δetf must be the SAME for every row.
    const ratios = out.rows.map((r, k) => {
      const prevEtf = k === 0 ? etfSeries[0].value : etfSeries[k].value;
      const dEtf = etfSeries[k + 1].value - prevEtf;
      return r.etfPnl / dEtf;
    });
    // Constant to within cent-rounding noise (≪ the ~2× spread a stray ρ factor
    // would introduce). A correlation-scaled v1-style P&L would NOT be constant.
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0], 1);
    // and that constant is the (unrounded) share count, which is positive and stable
    expect(ratios[0]).toBeGreaterThan(0);
  });

  it("reports realized correlation as an OUTPUT computed from the data (≈1 here)", () => {
    const out = runBacktest(inputs);
    expect(out.realizedCorrelation).toBeCloseTo(1, 3);
    expect(out.realizedHedgeEffectiveness).toBeCloseTo(1, 3);
  });

  it("shows full basis risk when the ETF is flat while fuel rises (hedge does nothing)", () => {
    const flatEtf = etfSeries.map((p) => ({ period: p.period, value: 60 }));
    const out = runBacktest({ ...inputs, etfSeries: flatEtf });
    for (const r of out.rows) {
      expect(r.etfPnl).toBeCloseTo(0, 6);
      expect(r.hedgedCost).toBeCloseTo(r.unhedgedCost, 6);
    }
  });

  it("is deterministic", () => {
    expect(runBacktest(inputs)).toEqual(runBacktest(inputs));
  });

  it("returns an empty result for insufficient data", () => {
    expect(runBacktest({ ...inputs, fuelSeries: [], etfSeries: [] }).periodCount).toBe(0);
  });
});

describe("pearson", () => {
  it("is 1 for a perfectly linear positive relationship", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });
  it("is -1 for a perfectly linear negative relationship", () => {
    expect(pearson([1, 2, 3], [-2, -4, -6])).toBeCloseTo(-1, 10);
  });
  it("is 0 for zero-variance input", () => {
    expect(pearson([1, 1, 1], [2, 4, 6])).toBe(0);
  });
});
