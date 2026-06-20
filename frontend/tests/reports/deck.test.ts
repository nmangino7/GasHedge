import { describe, it, expect } from "vitest";
import type { CompanyAnalysis } from "@/services/company-analysis";
import { buildDeck } from "@/reports/pptx-deck";
import { computeHedge } from "@/domain/finance/hedge-ratio";
import { runScenarios } from "@/domain/finance/scenarios";
import { calculateExposure } from "@/domain/finance/exposure";
import { buildStrategyLineup } from "@/domain/finance/strategies";
import { calculateRiskScore } from "@/domain/finance/risk-score";
import { DEFAULT_RISK_FREE_RATE } from "@/domain/finance/constants";

function mockAnalysis(): CompanyAnalysis {
  const { ratio, size } = computeHedge({
    monthlyGallons: 10_000, coverageRatio: 0.5, currentFuelPrice: 4, etfPrice: 60,
    ticker: "UGA", correlation: 0.88, fuelVolatility: 0.28, etfVolatility: 0.35,
  });
  return {
    company: {
      id: 1, name: "Martinez Landscaping", company_type: "landscaping",
      contact_name: "A", contact_email: "a@b.com", contact_phone: null,
      address_state: "CA", padd_region: "R50", fleet_size: 12, vehicle_types: "[]",
      fuel_type: "gasoline", monthly_gallons_gasoline: 10_000, monthly_gallons_diesel: 0,
      annual_revenue: 2_000_000, notes: null, status: "active",
      created_at: "2026-01-01", updated_at: "2026-01-01",
    },
    fuelType: "gasoline", monthlyGallons: 10_000, regionLabel: "West Coast (PADD 5)", coverageRatio: 0.5,
    market: { fuelPrice: 4, etfTicker: "UGA", etfPrice: 60, correlation: 0.88, fuelVolatility: 0.28, etfVolatility: 0.35 },
    exposure: calculateExposure({ monthlyGallonsGasoline: 10_000, monthlyGallonsDiesel: 0, currentPriceGasoline: 4, currentPriceDiesel: 4, annualRevenue: 2_000_000 }),
    hedgeRatio: ratio, hedgeSize: size, contracts: Math.max(1, Math.round(size.sharesNeeded / 100)),
    scenarios: runScenarios({ monthlyGallons: 10_000, hedgeSize: size, currentFuelPrice: 4, etfPrice: 60, beta: ratio.beta }),
    strategies: buildStrategyLineup({ ticker: "UGA", fuelType: "gasoline", etfPrice: 60, contracts: 5, iv: 0.35, riskFreeRate: DEFAULT_RISK_FREE_RATE }),
    riskScore: calculateRiskScore({ annualizedVolatility: 0.28, annualFuelCost: 480_000, annualRevenue: 2_000_000, paddRegion: "R50", fleetSize: 12, hedgeCoverage: 0 }),
    provenance: {
      overall: "fallback",
      fuelPrice: { source: "fallback", provider: "x", asOf: "now" },
      etfPrice: { source: "fallback", provider: "x", asOf: "now" },
      fuelVolatility: { source: "fallback", provider: "x", asOf: "now" },
    },
  };
}

describe("PowerPoint deck generator", () => {
  it("produces a non-trivial .pptx (zip) buffer", async () => {
    const buf = await buildDeck(mockAnalysis(), { firmName: "Acme Advisory", advisorName: "Jane Doe" });
    expect(buf.length).toBeGreaterThan(10_000);
    // .pptx is a zip — first two bytes are "PK".
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});
