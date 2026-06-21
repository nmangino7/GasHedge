// Advisor deal-revenue math. Pure functions, no I/O.

export type FeeStructure = "flat" | "aum_percentage" | "subscription";

export interface DealRevenueInputs {
  feeStructure: string;
  feeAmount: number;
  aumValue?: number | null;
}

/** Annualized advisory revenue for a single deal. */
export function calculateDealRevenue(i: DealRevenueInputs): number {
  switch (i.feeStructure) {
    case "flat":
      return i.feeAmount;
    case "aum_percentage":
      return (i.aumValue ?? 0) * (i.feeAmount / 100);
    case "subscription":
      return i.feeAmount * 12;
    default:
      return 0;
  }
}

export interface DealLike {
  status: string;
  feeStructure: string;
  annualFeeRevenue: number;
  companyId: number;
  companyName?: string | null;
}

export interface RevenueSummary {
  totalAnnualRevenue: number;
  totalMonthlyRevenue: number;
  activeDeals: number;
  pipelineValue: number;
  revenueByType: Record<string, number>;
}

const ACTIVE_STATUSES = new Set(["signed", "active"]);
const PIPELINE_STATUSES = new Set(["prospect", "proposed"]);

/** Roll up a set of deals into an advisor revenue dashboard summary. */
export function summarizeRevenue(deals: DealLike[]): RevenueSummary {
  let totalAnnualRevenue = 0;
  let activeDeals = 0;
  let pipelineValue = 0;
  const revenueByType: Record<string, number> = {};

  for (const d of deals) {
    if (ACTIVE_STATUSES.has(d.status)) {
      totalAnnualRevenue += d.annualFeeRevenue;
      activeDeals += 1;
      revenueByType[d.feeStructure] = (revenueByType[d.feeStructure] ?? 0) + d.annualFeeRevenue;
    } else if (PIPELINE_STATUSES.has(d.status)) {
      pipelineValue += d.annualFeeRevenue;
    }
  }

  return {
    totalAnnualRevenue: round2(totalAnnualRevenue),
    totalMonthlyRevenue: round2(totalAnnualRevenue / 12),
    activeDeals,
    pipelineValue: round2(pipelineValue),
    revenueByType,
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
