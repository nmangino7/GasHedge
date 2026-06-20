import { describe, it, expect } from "vitest";
import { valuePosition } from "@/domain/finance/position-valuation";
import { calculateExposure } from "@/domain/finance/exposure";
import { calculateRiskScore } from "@/domain/finance/risk-score";
import { calculateDealRevenue, summarizeRevenue } from "@/domain/finance/revenue";

describe("position valuation", () => {
  const base = {
    optionType: "call" as const,
    side: "long" as const,
    strike: 60,
    timeToExpiryYears: 0.25,
    contracts: 3,
    entryPremiumPerShare: 2.0,
    currentUnderlyingPrice: 64,
    iv: 0.35,
    riskFreeRate: 0.045,
  };

  it("intrinsic + time value == option price; long-call delta positive", () => {
    const v = valuePosition(base);
    expect(v.intrinsicValuePerShare).toBeCloseTo(4, 2); // 64 - 60
    expect(v.intrinsicValuePerShare + v.timeValuePerShare).toBeCloseTo(v.currentOptionPricePerShare, 2);
    expect(v.delta).toBeGreaterThan(0);
  });

  it("short positions carry negative current value", () => {
    const v = valuePosition({ ...base, side: "short" });
    expect(v.currentTotalValue).toBeLessThan(0);
  });

  it("at expiry, value is pure intrinsic (no time value)", () => {
    const v = valuePosition({ ...base, timeToExpiryYears: 0 });
    expect(v.timeValuePerShare).toBe(0);
    expect(v.currentOptionPricePerShare).toBeCloseTo(4, 2);
  });
});

describe("exposure", () => {
  it("computes monthly/annual cost, %revenue, and increasing price shocks", () => {
    const e = calculateExposure({
      monthlyGallonsGasoline: 1000,
      monthlyGallonsDiesel: 0,
      currentPriceGasoline: 4,
      currentPriceDiesel: 4,
      annualRevenue: 480_000,
    });
    expect(e.monthlyFuelCost).toBe(4000);
    expect(e.annualFuelCost).toBe(48_000);
    expect(e.fuelPctRevenue).toBeCloseTo(10, 2);
    const adds = e.scenarios.map((s) => s.additionalAnnualCost);
    expect(adds).toEqual([...adds].sort((a, b) => a - b)); // monotonic increasing
    expect(adds[0]).toBeGreaterThan(0);
  });
});

describe("risk score", () => {
  it("weights five factors and labels the level", () => {
    const r = calculateRiskScore({
      annualizedVolatility: 0.3,
      annualFuelCost: 200_000,
      annualRevenue: 1_000_000,
      paddRegion: "R50",
      fleetSize: 20,
      hedgeCoverage: 0,
    });
    expect(r.factors).toHaveLength(5);
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
    expect(["low", "moderate", "high"]).toContain(r.riskLevel);
    // fully unhedged → coverage factor is max risk
    expect(r.factors.find((f) => f.name === "Hedge Coverage")!.score).toBe(100);
  });

  it("uses safe defaults when volatility/revenue are missing", () => {
    const r = calculateRiskScore({
      annualizedVolatility: null,
      annualFuelCost: 0,
      paddRegion: "NUS",
      fleetSize: 1,
    });
    expect(r.factors.find((f) => f.name === "Price Volatility")!.score).toBe(50);
  });
});

describe("deal revenue", () => {
  it("computes per-structure revenue", () => {
    expect(calculateDealRevenue({ feeStructure: "flat", feeAmount: 1500 })).toBe(1500);
    expect(calculateDealRevenue({ feeStructure: "subscription", feeAmount: 300 })).toBe(3600);
    expect(calculateDealRevenue({ feeStructure: "aum_percentage", feeAmount: 1.5, aumValue: 200_000 })).toBe(3000);
    expect(calculateDealRevenue({ feeStructure: "unknown", feeAmount: 100 })).toBe(0);
  });

  it("summarizes active revenue vs pipeline", () => {
    const s = summarizeRevenue([
      { status: "active", feeStructure: "flat", annualFeeRevenue: 1500, companyId: 1 },
      { status: "signed", feeStructure: "subscription", annualFeeRevenue: 3600, companyId: 2 },
      { status: "prospect", feeStructure: "flat", annualFeeRevenue: 2000, companyId: 3 },
    ]);
    expect(s.totalAnnualRevenue).toBe(5100);
    expect(s.activeDeals).toBe(2);
    expect(s.pipelineValue).toBe(2000);
    expect(s.revenueByType.flat).toBe(1500);
  });
});
