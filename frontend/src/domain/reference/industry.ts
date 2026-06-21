// Industry fuel-consumption and exposure benchmarks. Static reference data.

export interface IndustryProfile {
  gallonsPerUnitPerMonth: { low: number; mid: number; high: number };
  fuelPctRevenue: { low: number; mid: number; high: number };
}

export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  landscaping: {
    gallonsPerUnitPerMonth: { low: 150, mid: 225, high: 300 },
    fuelPctRevenue: { low: 0.05, mid: 0.08, high: 0.12 },
  },
  trucking_local: {
    gallonsPerUnitPerMonth: { low: 1000, mid: 2000, high: 3000 },
    fuelPctRevenue: { low: 0.2, mid: 0.3, high: 0.4 },
  },
  trucking_longhaul: {
    gallonsPerUnitPerMonth: { low: 5000, mid: 7500, high: 10000 },
    fuelPctRevenue: { low: 0.25, mid: 0.35, high: 0.45 },
  },
  delivery: {
    gallonsPerUnitPerMonth: { low: 200, mid: 350, high: 500 },
    fuelPctRevenue: { low: 0.08, mid: 0.12, high: 0.18 },
  },
  construction: {
    gallonsPerUnitPerMonth: { low: 500, mid: 1000, high: 2000 },
    fuelPctRevenue: { low: 0.04, mid: 0.07, high: 0.1 },
  },
};

export interface IndustryDefault {
  fuelType: "gasoline" | "diesel";
  gallonsPerUnit: number;
}

export const INDUSTRY_DEFAULTS: Record<string, IndustryDefault> = {
  landscaping: { fuelType: "gasoline", gallonsPerUnit: 225 },
  trucking_local: { fuelType: "diesel", gallonsPerUnit: 2000 },
  trucking_longhaul: { fuelType: "diesel", gallonsPerUnit: 7500 },
  delivery: { fuelType: "gasoline", gallonsPerUnit: 350 },
  construction: { fuelType: "diesel", gallonsPerUnit: 1000 },
};

export function getIndustryProfile(companyType: string): IndustryProfile | null {
  return INDUSTRY_PROFILES[companyType] ?? null;
}
