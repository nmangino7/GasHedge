import { z } from "zod";
import { companyStore } from "@/lib/store";
import {
  getCurrentPrice,
  getPriceHistory,
  calculateVolatility,
} from "@/lib/eia-service";
import { getETFPrice } from "@/lib/alpha-vantage";
import {
  preferredTicker,
  getCorrelation,
  getDefaultIV,
  DEFAULT_ETF_PRICES,
  DEFAULT_FUEL_VOL,
  DEFAULT_RISK_FREE_RATE,
  FuelType,
} from "@/domain/finance/constants";
import { computeHedge, contractsForHedge } from "@/domain/finance/hedge-ratio";
import { calculateExposure } from "@/domain/finance/exposure";
import { runScenarios } from "@/domain/finance/scenarios";
import { buildStrategy, StrategyKey } from "@/domain/finance/strategies";
import { getFuelPrice, getEtfPrice } from "@/services/market-data";

const companyId = z.object({ companyId: z.number() });

// --- Shared context: everything needed to size a hedge for a company ---------

interface CompanyContext {
  id: number;
  name: string;
  companyType: string;
  fleetSize: number;
  fuelType: FuelType;
  paddRegion: string;
  monthlyGallons: number;
  annualRevenue: number | null;
  fuelPrice: number;
  ticker: string;
  etfPrice: number;
  correlation: number;
  sigmaFuel: number;
  sigmaEtf: number;
}

async function gatherContext(id: number): Promise<CompanyContext> {
  const company = await companyStore.get(id);
  if (!company) throw new ToolError(`No company with id ${id}.`);

  const fuelType: FuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
  const monthlyGallons =
    fuelType === "diesel"
      ? company.monthly_gallons_diesel || 0
      : company.monthly_gallons_gasoline || 0;
  const ticker = preferredTicker(fuelType);

  const [fuelPrice, etfPrice, history] = await Promise.all([
    getCurrentPrice(fuelType, company.padd_region).catch(() => 3.5),
    getETFPrice(ticker).catch(() => DEFAULT_ETF_PRICES[ticker] ?? 50),
    getPriceHistory(fuelType, company.padd_region, 2).catch(() => []),
  ]);

  const vol = history.length > 1 ? calculateVolatility(history) : null;
  const sigmaFuel = vol?.annualized_volatility || DEFAULT_FUEL_VOL[fuelType];
  const sigmaEtf = getDefaultIV(ticker);

  return {
    id,
    name: company.name,
    companyType: company.company_type,
    fleetSize: company.fleet_size,
    fuelType,
    paddRegion: company.padd_region,
    monthlyGallons,
    annualRevenue: company.annual_revenue,
    fuelPrice,
    ticker,
    etfPrice,
    correlation: getCorrelation(fuelType, ticker),
    sigmaFuel,
    sigmaEtf,
  };
}

function hedgeFor(ctx: CompanyContext, coverageRatio: number) {
  return computeHedge({
    monthlyGallons: ctx.monthlyGallons,
    coverageRatio,
    currentFuelPrice: ctx.fuelPrice,
    etfPrice: ctx.etfPrice,
    ticker: ctx.ticker,
    correlation: ctx.correlation,
    fuelVolatility: ctx.sigmaFuel,
    etfVolatility: ctx.sigmaEtf,
  });
}

// --- Dispatch ---------------------------------------------------------------

export class ToolError extends Error {}

export async function runTool(name: string, rawInput: unknown): Promise<unknown> {
  switch (name) {
    case "get_company_profile": {
      const { companyId: id } = companyId.parse(rawInput);
      const ctx = await gatherContext(id);
      return {
        name: ctx.name,
        companyType: ctx.companyType,
        fleetSize: ctx.fleetSize,
        fuelType: ctx.fuelType,
        paddRegion: ctx.paddRegion,
        monthlyGallons: ctx.monthlyGallons,
        annualRevenue: ctx.annualRevenue,
      };
    }
    case "get_market_data": {
      const { companyId: id } = companyId.parse(rawInput);
      const ctx = await gatherContext(id);
      return {
        fuelType: ctx.fuelType,
        currentFuelPrice: ctx.fuelPrice,
        recommendedEtf: ctx.ticker,
        etfPrice: ctx.etfPrice,
        correlation: ctx.correlation,
        fuelVolatility: ctx.sigmaFuel,
        etfVolatility: ctx.sigmaEtf,
      };
    }
    case "compute_exposure": {
      const { companyId: id } = companyId.parse(rawInput);
      const company = await companyStore.get(id);
      if (!company) throw new ToolError(`No company with id ${id}.`);
      const gasPrice = await getCurrentPrice("gasoline", company.padd_region).catch(() => 3.5);
      const dieselPrice = await getCurrentPrice("diesel", company.padd_region).catch(() => 3.9);
      return calculateExposure({
        monthlyGallonsGasoline: company.monthly_gallons_gasoline || 0,
        monthlyGallonsDiesel: company.monthly_gallons_diesel || 0,
        currentPriceGasoline: gasPrice,
        currentPriceDiesel: dieselPrice,
        annualRevenue: company.annual_revenue,
      });
    }
    case "size_hedge": {
      const { companyId: id, coverageRatio } = companyId
        .extend({ coverageRatio: z.number().min(0).max(1) })
        .parse(rawInput);
      const ctx = await gatherContext(id);
      const { ratio, size } = hedgeFor(ctx, coverageRatio);
      return { ticker: ctx.ticker, etfPrice: ctx.etfPrice, coverageRatio, ...ratio, ...size };
    }
    case "price_strategy": {
      const { companyId: id, strategyKey, coverageRatio } = companyId
        .extend({
          strategyKey: z.string(),
          coverageRatio: z.number().min(0).max(1).optional(),
        })
        .parse(rawInput);
      const ctx = await gatherContext(id);
      const { size } = hedgeFor(ctx, coverageRatio ?? 0.5);
      return buildStrategy(strategyKey as StrategyKey, {
        ticker: ctx.ticker,
        fuelType: ctx.fuelType,
        etfPrice: ctx.etfPrice,
        contracts: contractsForHedge(size),
        iv: ctx.sigmaEtf,
        riskFreeRate: DEFAULT_RISK_FREE_RATE,
        daysToExpiry: 120,
      });
    }
    case "run_scenarios": {
      const { companyId: id, coverageRatio, basisDriftPct } = companyId
        .extend({
          coverageRatio: z.number().min(0).max(1).optional(),
          basisDriftPct: z.number().optional(),
        })
        .parse(rawInput);
      const ctx = await gatherContext(id);
      const { ratio, size } = hedgeFor(ctx, coverageRatio ?? 0.5);
      return runScenarios({
        monthlyGallons: ctx.monthlyGallons,
        hedgeSize: size,
        currentFuelPrice: ctx.fuelPrice,
        etfPrice: ctx.etfPrice,
        beta: ratio.beta,
        basisDriftPct,
      });
    }
    case "get_national_fuel_prices": {
      const [g, d] = await Promise.all([
        getFuelPrice("gasoline", "NUS"),
        getFuelPrice("diesel", "NUS"),
      ]);
      return {
        gasoline: { pricePerGallon: g.value, source: g.provenance.source, asOf: g.provenance.asOf },
        diesel: { pricePerGallon: d.value, source: d.provenance.source, asOf: d.provenance.asOf },
      };
    }
    case "get_etf_quote": {
      const { ticker } = z.object({ ticker: z.string() }).parse(rawInput);
      const p = await getEtfPrice(ticker);
      return { ticker: ticker.toUpperCase(), price: p.value, source: p.provenance.source, asOf: p.provenance.asOf };
    }
    default:
      throw new ToolError(`Unknown tool: ${name}`);
  }
}
