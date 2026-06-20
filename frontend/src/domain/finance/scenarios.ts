// Forward scenario analysis for an outright ETF hedge.
//
// THE FIX (companion to hedge-ratio.ts): the scenario sweeps the ETF move as the
// DRIVER and derives the fuel move from it via the beta hedge ratio plus an
// explicit basis-drift term:
//       fuelChange = beta · etfChange + basisDrift
// Hedge P&L is the REAL share P&L  shares · ΔetfPrice. Because beta (not just ρ)
// links the two and the hedge P&L is computed from actual shares, `correlation`
// no longer cancels — an imperfect hedge (beta < 1, or basisDrift ≠ 0) shows a
// real `residualExposure`, which is the whole point.
//
// Pure functions, no I/O.

import { HedgeSize } from "./hedge-ratio";

/** Derive the fuel-price move implied by an ETF move under the beta model. */
export function fuelChangeFromEtf(
  etfChange: number,
  beta: number,
  basisDrift = 0
): number {
  return beta * etfChange + basisDrift;
}

export interface ScenarioInputs {
  monthlyGallons: number;
  hedgeSize: HedgeSize;
  currentFuelPrice: number;
  etfPrice: number;
  beta: number;
  /** Stress lever: extra fuel move not explained by the ETF (e.g. +0.05). */
  basisDriftPct?: number;
  /** ETF price changes to sweep (the driver). Defaults to -30%..+60%. */
  etfPriceChanges?: number[];
}

export interface ScenarioRow {
  etfChangePct: number;
  fuelChangePct: number;
  newEtfPrice: number;
  newFuelPrice: number;
  unhedgedAnnualCost: number;
  etfPnl: number;
  hedgedAnnualCost: number;
  /** Covered fuel-cost change the hedge fails to offset (basis risk made explicit). */
  residualExposure: number;
  savings: number;
  savingsPct: number;
}

export interface ScenarioBreakeven {
  etfChangePct: number;
  fuelChangePct: number;
  fuelPrice: number;
}

export interface ScenarioOutput {
  rows: ScenarioRow[];
  breakeven: ScenarioBreakeven | null;
  beta: number;
  hedgeEffectiveness: number;
  basisDriftPct: number;
  basisRiskNote: string;
}

const DEFAULT_CHANGES = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.4, 0.6];

export function runScenarios(i: ScenarioInputs): ScenarioOutput {
  const basisDrift = i.basisDriftPct ?? 0;
  const changes = i.etfPriceChanges ?? DEFAULT_CHANGES;
  const annualGallons = i.monthlyGallons * 12;
  const hedgeSize = i.hedgeSize;
  const shares = hedgeSize.sharesNeeded;
  const expenseDrag = hedgeSize.annualExpenseDrag;

  const rows: ScenarioRow[] = changes.map((etfChange) => {
    const newEtfPrice = i.etfPrice * (1 + etfChange);
    const fuelChange = fuelChangeFromEtf(etfChange, i.beta, basisDrift);
    const newFuelPrice = i.currentFuelPrice * (1 + fuelChange);

    const unhedgedAnnualCost = annualGallons * newFuelPrice;
    const etfPnl = shares * (newEtfPrice - i.etfPrice);
    const hedgedAnnualCost = unhedgedAnnualCost - etfPnl + expenseDrag;
    const savings = unhedgedAnnualCost - hedgedAnnualCost; // = etfPnl - expenseDrag

    // Covered fuel-cost change vs the ETF gain that is supposed to offset it.
    const coveredCostChange =
      hedgeSize.gallonsHedged * (newFuelPrice - i.currentFuelPrice);
    const residualExposure = coveredCostChange - etfPnl;

    return {
      etfChangePct: round4(etfChange),
      fuelChangePct: round4(fuelChange),
      newEtfPrice: round2(newEtfPrice),
      newFuelPrice: round3(newFuelPrice),
      unhedgedAnnualCost: round2(unhedgedAnnualCost),
      etfPnl: round2(etfPnl),
      hedgedAnnualCost: round2(hedgedAnnualCost),
      residualExposure: round2(residualExposure),
      savings: round2(savings),
      savingsPct:
        unhedgedAnnualCost > 0
          ? round2((savings / unhedgedAnnualCost) * 100)
          : 0,
    };
  });

  // Analytic breakeven: savings = shares·etfPrice·etfChange − expenseDrag = 0.
  const etfNotional = shares * i.etfPrice;
  let breakeven: ScenarioBreakeven | null = null;
  if (etfNotional > 0) {
    const etfChangeBE = expenseDrag / etfNotional;
    const fuelChangeBE = fuelChangeFromEtf(etfChangeBE, i.beta, basisDrift);
    breakeven = {
      etfChangePct: round4(etfChangeBE),
      fuelChangePct: round4(fuelChangeBE),
      fuelPrice: round3(i.currentFuelPrice * (1 + fuelChangeBE)),
    };
  }

  const effectiveness = hedgeSize.hedgeEffectiveness;
  return {
    rows,
    breakeven,
    beta: round4(i.beta),
    hedgeEffectiveness: round4(effectiveness),
    basisDriftPct: basisDrift,
    basisRiskNote:
      `Retail fuel moves about ${(i.beta * 100).toFixed(0)}% as much as the ETF per unit move ` +
      `(β=${i.beta.toFixed(2)}). The hedge removes roughly ${(effectiveness * 100).toFixed(0)}% of fuel-cost variance; ` +
      `the rest is basis risk you keep.`,
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
