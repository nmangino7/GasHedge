import { describe, it, expect } from "vitest";
import { paddForState, paddLabel } from "@/domain/reference/padd";
import { getIndustryProfile, INDUSTRY_DEFAULTS } from "@/domain/reference/industry";
import { DISCLAIMERS } from "@/domain/reference/disclaimers";
import {
  preferredTicker,
  getCorrelation,
  getExpenseRatio,
  getDefaultIV,
  yearsBetween,
} from "@/domain/finance/constants";

describe("reference data", () => {
  it("maps states to the correct PADD region", () => {
    expect(paddForState("CA")).toBe("R50");
    expect(paddForState("TX")).toBe("R30");
    expect(paddForState("NY")).toBe("R10");
    expect(paddForState("OH")).toBe("R20");
    expect(paddForState("CO")).toBe("R40");
    expect(paddForState("ZZ")).toBe("NUS"); // unknown → US average
    expect(paddLabel("R50")).toMatch(/West Coast/);
  });

  it("exposes industry profiles and defaults", () => {
    expect(getIndustryProfile("landscaping")!.gallonsPerUnitPerMonth.mid).toBe(225);
    expect(getIndustryProfile("nope")).toBeNull();
    expect(INDUSTRY_DEFAULTS.trucking_longhaul.fuelType).toBe("diesel");
  });

  it("ships the compliance disclaimers", () => {
    expect(DISCLAIMERS.length).toBeGreaterThanOrEqual(5);
  });
});

describe("finance constants helpers", () => {
  it("steers fuel types to the right ETF and looks up metadata", () => {
    expect(preferredTicker("gasoline")).toBe("UGA");
    expect(preferredTicker("diesel")).toBe("USO");
    expect(getCorrelation("gasoline", "UGA")).toBe(0.88);
    expect(getCorrelation("gasoline", "ZZZ")).toBe(0.8); // default
    expect(getExpenseRatio("UGA")).toBeCloseTo(0.0097, 6);
    expect(getExpenseRatio("ZZZ")).toBe(0.01);
    expect(getDefaultIV("uga")).toBe(0.35);
  });

  it("yearsBetween is ~1 for a 365.25-day span", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const to = new Date(from.getTime() + 365.25 * 24 * 3600 * 1000);
    expect(yearsBetween(from, to)).toBeCloseTo(1, 6);
  });
});
