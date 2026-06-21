import { describe, it, expect } from "vitest";
import {
  longCall,
  collar,
  bullCallSpread,
  ironCondor,
  coveredCall,
  buildStrategyLineup,
  StrategyInput,
} from "@/domain/finance/strategies";

const base: StrategyInput = {
  ticker: "UGA",
  fuelType: "gasoline",
  etfPrice: 60,
  contracts: 5,
  iv: 0.35,
  riskFreeRate: 0.045,
  daysToExpiry: 120,
};

describe("option strategy builders", () => {
  it("long call: pays a debit, capped loss = premium, unlimited gain, breakeven above spot", () => {
    const s = longCall(base);
    expect(s.totalPremium).toBeGreaterThan(0); // debit
    expect(s.maxGain).toBe("Unlimited");
    expect(s.maxLoss).toBe(s.totalPremium);
    expect(s.breakevenEtfPrice!).toBeGreaterThan(base.etfPrice);
    expect(s.netDelta).toBeGreaterThan(0);
    expect(s.legs).toHaveLength(1);
  });

  it("collar: floor/ceiling bracket the spot and require owning the shares", () => {
    const s = collar(base);
    const put = s.legs.find((l) => l.optionType === "put")!;
    const call = s.legs.find((l) => l.optionType === "call")!;
    expect(put.strike).toBeCloseTo(60 * 0.92, 2); // floor
    expect(call.strike).toBeCloseTo(60 * 1.08, 2); // ceiling
    expect(s.sharesRequired).toBe(500);
  });

  it("bull call spread: capped, defined-risk; max loss = net debit; breakeven = long + debit/shares", () => {
    const s = bullCallSpread(base);
    expect(typeof s.maxGain).toBe("number");
    expect(s.maxLoss).toBe(s.totalPremium);
    expect(s.totalPremium).toBeGreaterThan(0);
    const longStrike = 60;
    expect(s.breakevenEtfPrice!).toBeCloseTo(longStrike + s.totalPremium / (100 * base.contracts), 2);
  });

  it("iron condor: collects a credit, defined max loss, no single breakeven", () => {
    const s = ironCondor(base);
    expect(s.totalPremium).toBeLessThan(0); // credit
    expect(s.maxGain).toBeGreaterThan(0);
    expect(s.maxLoss).toBeGreaterThan(0);
    expect(s.breakevenEtfPrice).toBeNull();
    expect(s.legs).toHaveLength(4);
  });

  it("covered call: net delta between 0 and the shares owned (long stock, short call)", () => {
    const s = coveredCall(base);
    expect(s.sharesRequired).toBe(500);
    expect(s.netDelta).toBeGreaterThan(0);
    expect(s.netDelta).toBeLessThan(500);
    expect(s.totalPremium).toBeLessThan(0); // credit
  });

  it("lineup returns all eight strategies", () => {
    expect(buildStrategyLineup(base)).toHaveLength(8);
  });
});
