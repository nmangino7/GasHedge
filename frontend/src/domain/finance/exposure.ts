// Fuel-cost exposure analysis. Pure functions, no I/O.

export interface ExposureInputs {
  monthlyGallonsGasoline: number;
  monthlyGallonsDiesel: number;
  currentPriceGasoline: number;
  currentPriceDiesel: number;
  annualRevenue?: number | null;
}

export interface ExposureShock {
  priceChangePct: number;
  label: string;
  monthlyCost: number;
  annualCost: number;
  additionalAnnualCost: number;
}

export interface Exposure {
  monthlyGallonsGasoline: number;
  monthlyGallonsDiesel: number;
  currentPriceGasoline: number;
  currentPriceDiesel: number;
  monthlyFuelCost: number;
  annualFuelCost: number;
  fuelPctRevenue: number | null;
  scenarios: ExposureShock[];
}

const SHOCKS = [0.1, 0.2, 0.4, 0.6];

export function calculateExposure(i: ExposureInputs): Exposure {
  const monthlyFuelCost =
    i.monthlyGallonsGasoline * i.currentPriceGasoline +
    i.monthlyGallonsDiesel * i.currentPriceDiesel;
  const annualFuelCost = monthlyFuelCost * 12;

  const fuelPctRevenue =
    i.annualRevenue && i.annualRevenue > 0
      ? round2((annualFuelCost / i.annualRevenue) * 100)
      : null;

  const scenarios: ExposureShock[] = SHOCKS.map((pct) => {
    const monthly =
      i.monthlyGallonsGasoline * i.currentPriceGasoline * (1 + pct) +
      i.monthlyGallonsDiesel * i.currentPriceDiesel * (1 + pct);
    const annual = monthly * 12;
    return {
      priceChangePct: pct,
      label: `+${Math.round(pct * 100)}%`,
      monthlyCost: round2(monthly),
      annualCost: round2(annual),
      additionalAnnualCost: round2(annual - annualFuelCost),
    };
  });

  return {
    monthlyGallonsGasoline: i.monthlyGallonsGasoline,
    monthlyGallonsDiesel: i.monthlyGallonsDiesel,
    currentPriceGasoline: round3(i.currentPriceGasoline),
    currentPriceDiesel: round3(i.currentPriceDiesel),
    monthlyFuelCost: round2(monthlyFuelCost),
    annualFuelCost: round2(annualFuelCost),
    fuelPctRevenue,
    scenarios,
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
