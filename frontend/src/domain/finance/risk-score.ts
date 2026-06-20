// Five-factor fuel-price risk score (0–100). Pure functions, no I/O.
// Extracted from the old /api/risk-score route so it can be unit-tested.

export interface RiskScoreInputs {
  /** Annualized fuel-price volatility (decimal, e.g. 0.30). Null if unknown. */
  annualizedVolatility: number | null;
  annualFuelCost: number;
  annualRevenue?: number | null;
  paddRegion: string;
  fleetSize: number;
  /** Fraction of consumption currently hedged (0..1). */
  hedgeCoverage?: number;
}

export interface RiskFactor {
  name: string;
  score: number;
  benchmark: number;
  description: string;
  recommendation: string;
}

export interface RiskScore {
  overallScore: number;
  riskLevel: "low" | "moderate" | "high";
  factors: RiskFactor[];
}

const REGIONAL_RISK: Record<string, number> = {
  R50: 85,
  R10: 65,
  R40: 60,
  R30: 45,
  R20: 50,
  NUS: 55,
};

const WEIGHTS = {
  volatility: 0.25,
  exposure: 0.25,
  region: 0.15,
  fleet: 0.15,
  coverage: 0.2,
} as const;

export function calculateRiskScore(i: RiskScoreInputs): RiskScore {
  const volatilityScore =
    i.annualizedVolatility != null
      ? clamp100(Math.round(i.annualizedVolatility * 100 * 3))
      : 50;

  const exposureScore =
    i.annualRevenue && i.annualRevenue > 0
      ? clamp100(Math.round((i.annualFuelCost / i.annualRevenue) * 100 * 3))
      : 50;

  const regionScore = REGIONAL_RISK[i.paddRegion] ?? 55;
  const fleetScore = clamp100(Math.round(i.fleetSize * 3));
  const coverageScore = clamp100(Math.round(100 - (i.hedgeCoverage ?? 0) * 100));

  const overallScore = Math.round(
    volatilityScore * WEIGHTS.volatility +
      exposureScore * WEIGHTS.exposure +
      regionScore * WEIGHTS.region +
      fleetScore * WEIGHTS.fleet +
      coverageScore * WEIGHTS.coverage
  );

  const riskLevel = overallScore >= 70 ? "high" : overallScore >= 40 ? "moderate" : "low";

  return {
    overallScore,
    riskLevel,
    factors: [
      factor("Price Volatility", volatilityScore, 50,
        "Based on annualized fuel-price volatility in your region",
        volatilityScore > 60 ? "High volatility — hedging is strongly recommended" : "Moderate volatility — hedging provides stability"),
      factor("Fuel Exposure", exposureScore, 45,
        "Fuel costs as a percentage of revenue",
        exposureScore > 60 ? "Fuel is a major cost driver — prioritize cost management" : "Manageable fuel exposure"),
      factor("Regional Risk", regionScore, 55,
        `${i.paddRegion} pricing tends to be ${regionScore > 65 ? "above" : "near"} the national average`,
        regionScore > 65 ? "Your region has higher-than-average fuel costs and volatility" : "Your region has relatively stable fuel pricing"),
      factor("Fleet Size", fleetScore, 30,
        `${i.fleetSize} vehicles`,
        fleetScore > 50 ? "Large fleet amplifies price exposure — consider hedging" : "Smaller fleet, lower absolute risk"),
      factor("Hedge Coverage", coverageScore, 50,
        "Percentage of fuel consumption currently unhedged",
        coverageScore > 70 ? "No active hedge — implement a hedging strategy to reduce risk" : "Partially hedged — consider increasing coverage"),
    ],
  };
}

function factor(name: string, score: number, benchmark: number, description: string, recommendation: string): RiskFactor {
  return { name, score, benchmark, description, recommendation };
}

function clamp100(x: number): number {
  return Math.min(100, Math.max(0, x));
}
