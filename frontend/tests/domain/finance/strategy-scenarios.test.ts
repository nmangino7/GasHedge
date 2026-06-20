import { describe, it, expect } from "vitest";
import { buildStrategyScenarios } from "@/domain/finance/strategy-scenarios";
import { longCall, collar } from "@/domain/finance/strategies";

const strat = longCall({
  ticker: "UGA",
  fuelType: "gasoline",
  etfPrice: 60,
  contracts: 5,
  iv: 0.35,
  riskFreeRate: 0.045,
  daysToExpiry: 120,
});

describe("option strategy modeler (basis model)", () => {
  it("derives fuel move from ETF move via beta (not raw correlation)", () => {
    const out = buildStrategyScenarios({
      strategy: strat,
      monthlyGallons: 10_000,
      currentFuelPrice: 4,
      beta: 0.5,
      etfPriceChanges: [0.2],
    });
    // beta 0.5, etf +20% → fuel +10%
    expect(out.points[0].fuelPctChange).toBeCloseTo(10, 4);
    expect(out.points[0].impliedFuelPrice).toBeCloseTo(4.4, 4);
  });

  it("a long call gains value when the ETF rallies and finds a breakeven", () => {
    const out = buildStrategyScenarios({
      strategy: strat,
      monthlyGallons: 10_000,
      currentFuelPrice: 4,
      beta: 0.6,
    });
    const up = out.points[out.points.length - 1];
    expect(up.optionPayoff).toBeGreaterThan(0);
    expect(out.bestCaseHedgeValue).toBeGreaterThan(0);
    expect(out.worstCaseHedgeValue).toBeLessThanOrEqual(0);
    expect(out.breakevenEtfPrice).not.toBeNull();
  });

  it("includes the underlying ETF leg P&L for strategies that own shares (collar)", () => {
    const c = collar({
      ticker: "USO",
      fuelType: "diesel",
      etfPrice: 70,
      contracts: 4,
      iv: 0.32,
      riskFreeRate: 0.045,
      daysToExpiry: 90,
    });
    const out = buildStrategyScenarios({
      strategy: c,
      monthlyGallons: 20_000,
      currentFuelPrice: 4,
      beta: 0.5,
      etfPriceChanges: [0.1],
    });
    expect(out.sharesOwned).toBe(400);
    expect(out.points[0].etfPayoff).toBeCloseTo(400 * (70 * 1.1 - 70), 0);
  });
});
