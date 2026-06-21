// One server-side analyzer that turns a company id into a complete, CORRECTED
// hedging analysis with data provenance. Shared by the AI tool-runner and the
// client report/deck generators so every surface shows the same right numbers.

import { companyStore } from "@/lib/store";
import type { Company } from "@/lib/types";
import { getFuelPrice, getEtfPrice, getFuelVolatility } from "./market-data";
import { Provenance, rollup, DataSourceKind } from "./provenance";
import {
  preferredTicker,
  getCorrelation,
  getDefaultIV,
  DEFAULT_RISK_FREE_RATE,
  FuelType,
} from "@/domain/finance/constants";
import { computeHedge, contractsForHedge, HedgeRatioResult, HedgeSize } from "@/domain/finance/hedge-ratio";
import { runScenarios, ScenarioOutput } from "@/domain/finance/scenarios";
import { calculateExposure, Exposure } from "@/domain/finance/exposure";
import { buildStrategyLineup, StrategyResult } from "@/domain/finance/strategies";
import { calculateRiskScore, RiskScore } from "@/domain/finance/risk-score";
import { paddLabel } from "@/domain/reference/padd";

export interface CompanyAnalysis {
  company: Company;
  fuelType: FuelType;
  monthlyGallons: number;
  regionLabel: string;
  coverageRatio: number;
  market: {
    fuelPrice: number;
    etfTicker: string;
    etfPrice: number;
    correlation: number;
    fuelVolatility: number;
    etfVolatility: number;
  };
  exposure: Exposure;
  hedgeRatio: HedgeRatioResult;
  hedgeSize: HedgeSize;
  contracts: number;
  scenarios: ScenarioOutput;
  strategies: StrategyResult[];
  riskScore: RiskScore;
  provenance: {
    overall: DataSourceKind;
    fuelPrice: Provenance;
    etfPrice: Provenance;
    fuelVolatility: Provenance;
  };
}

export class CompanyNotFoundError extends Error {}

export async function analyzeCompany(
  companyId: number,
  coverageRatio = 0.5
): Promise<CompanyAnalysis> {
  const company = await companyStore.get(companyId);
  if (!company) throw new CompanyNotFoundError(`No company with id ${companyId}.`);

  const fuelType: FuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
  const monthlyGallons =
    fuelType === "diesel"
      ? company.monthly_gallons_diesel || 0
      : company.monthly_gallons_gasoline || 0;
  const ticker = preferredTicker(fuelType);

  // Gather live (or fallback) market inputs in parallel.
  const [fuelP, gasP, dieselP, etfP, fuelVol] = await Promise.all([
    getFuelPrice(fuelType, company.padd_region),
    getFuelPrice("gasoline", company.padd_region),
    getFuelPrice("diesel", company.padd_region),
    getEtfPrice(ticker),
    getFuelVolatility(fuelType, company.padd_region),
  ]);

  const etfVolatility = getDefaultIV(ticker); // modeled IV proxy for σ_etf
  const correlation = getCorrelation(fuelType, ticker);

  const exposure = calculateExposure({
    monthlyGallonsGasoline: company.monthly_gallons_gasoline || 0,
    monthlyGallonsDiesel: company.monthly_gallons_diesel || 0,
    currentPriceGasoline: gasP.value,
    currentPriceDiesel: dieselP.value,
    annualRevenue: company.annual_revenue,
  });

  const { ratio, size } = computeHedge({
    monthlyGallons,
    coverageRatio,
    currentFuelPrice: fuelP.value,
    etfPrice: etfP.value,
    ticker,
    correlation,
    fuelVolatility: fuelVol.value,
    etfVolatility,
  });
  const contracts = contractsForHedge(size);

  const scenarios = runScenarios({
    monthlyGallons,
    hedgeSize: size,
    currentFuelPrice: fuelP.value,
    etfPrice: etfP.value,
    beta: ratio.beta,
  });

  const strategies = buildStrategyLineup({
    ticker,
    fuelType,
    etfPrice: etfP.value,
    contracts,
    iv: etfVolatility,
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
  });

  const riskScore = calculateRiskScore({
    annualizedVolatility: fuelVol.provenance.source === "live" ? fuelVol.value : null,
    annualFuelCost: exposure.annualFuelCost,
    annualRevenue: company.annual_revenue,
    paddRegion: company.padd_region,
    fleetSize: company.fleet_size,
    hedgeCoverage: 0,
  });

  return {
    company,
    fuelType,
    monthlyGallons,
    regionLabel: paddLabel(company.padd_region),
    coverageRatio,
    market: {
      fuelPrice: fuelP.value,
      etfTicker: ticker,
      etfPrice: etfP.value,
      correlation,
      fuelVolatility: fuelVol.value,
      etfVolatility,
    },
    exposure,
    hedgeRatio: ratio,
    hedgeSize: size,
    contracts,
    scenarios,
    strategies,
    riskScore,
    provenance: {
      overall: rollup(fuelP.provenance, etfP.provenance, fuelVol.provenance),
      fuelPrice: fuelP.provenance,
      etfPrice: etfP.provenance,
      fuelVolatility: fuelVol.provenance,
    },
  };
}
