// Reference data for fuel-hedge ETFs.
// Expense ratios and AUM are point-in-time snapshots (last refresh: 2026-05-12).
// Correlations are 24-month rolling vs retail EIA prices.

export type EtfStructure = "Limited Partnership (Section 1256)" | "Open-End ETF (RIC)";
export type TaxForm = "K-1 (Schedule)" | "Form 1099";

export interface EtfMeta {
  ticker: string;
  name: string;
  issuer: string;
  inception: string;
  structure: EtfStructure;
  tax_form: TaxForm;
  expense_ratio: number; // annualized, e.g. 0.0097 = 0.97%
  aum_millions: number;
  underlying: string;
  underlying_exchange: string;
  primary_fuel: "gasoline" | "diesel" | "crude" | "natural gas";
  correlation_to_retail: number; // 24M rolling
  liquidity_class: "High" | "Medium" | "Lower";
  avg_daily_volume_thousands: number;
  options_available: boolean;
  options_avg_oi: string;
  default_iv: number;
  weekly_decay_pct: number; // contango drag estimate
  description: string;
  best_for: string[];
  risks: string[];
}

export const ETF_LIBRARY: Record<string, EtfMeta> = {
  UGA: {
    ticker: "UGA",
    name: "United States Gasoline Fund LP",
    issuer: "United States Commodity Funds",
    inception: "2008-02-26",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.0097,
    aum_millions: 142,
    underlying: "RBOB gasoline front-month futures",
    underlying_exchange: "NYMEX",
    primary_fuel: "gasoline",
    correlation_to_retail: 0.88,
    liquidity_class: "High",
    avg_daily_volume_thousands: 78,
    options_available: true,
    options_avg_oi: "20K–40K contracts across nearest 3 expiries",
    default_iv: 0.35,
    weekly_decay_pct: 0.0008,
    description:
      "UGA tracks the front-month RBOB gasoline contract on NYMEX. As the gasoline futures contract approaches expiry, UGA rolls into the next month — this introduces contango drag in flat or downward-sloping markets. Best correlation to U.S. retail gasoline of any liquid ETF.",
    best_for: [
      "Pure gasoline price exposure",
      "Trucking fleets with significant unleaded fuel consumption",
      "Landscaping, delivery, contractor fleets",
    ],
    risks: [
      "Contango drag: ~0.08%/wk in normal markets",
      "K-1 tax form — requires extra paperwork",
      "Tracking error vs retail pump prices (0.88 correlation, not 1.0)",
      "Lower liquidity than USO during overnight markets",
    ],
  },
  USO: {
    ticker: "USO",
    name: "United States Oil Fund LP",
    issuer: "United States Commodity Funds",
    inception: "2006-04-10",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.0081,
    aum_millions: 1340,
    underlying: "WTI crude oil futures (rolled spread across nearest 12 months since 2020)",
    underlying_exchange: "NYMEX",
    primary_fuel: "crude",
    correlation_to_retail: 0.80,
    liquidity_class: "High",
    avg_daily_volume_thousands: 4500,
    options_available: true,
    options_avg_oi: "200K+ contracts across nearest 3 expiries",
    default_iv: 0.32,
    weekly_decay_pct: 0.0006,
    description:
      "USO is the most liquid oil ETF in the U.S. Following the 2020 contango crisis, USO restructured to hold a basket of 12 monthly contracts rather than just the front-month — this dramatically reduces contango drag versus its pre-2020 structure. Strong proxy for diesel and refined fuel prices.",
    best_for: [
      "Diesel price exposure (most-correlated diesel hedge after ULSD futures)",
      "Long-haul trucking, freight carriers",
      "Bulk fuel buyers, marine operators",
    ],
    risks: [
      "Reduced but non-zero contango drag",
      "K-1 tax form",
      "Tracks WTI, not Brent — Brent-correlated businesses should consider BNO",
      "Rebalances monthly: small basis tracking error",
    ],
  },
  BNO: {
    ticker: "BNO",
    name: "United States Brent Oil Fund LP",
    issuer: "United States Commodity Funds",
    inception: "2010-06-02",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.009,
    aum_millions: 168,
    underlying: "Brent crude oil futures (ICE), rolled monthly",
    underlying_exchange: "ICE Europe",
    primary_fuel: "crude",
    correlation_to_retail: 0.78,
    liquidity_class: "Medium",
    avg_daily_volume_thousands: 420,
    options_available: true,
    options_avg_oi: "15K–30K contracts",
    default_iv: 0.31,
    weekly_decay_pct: 0.0005,
    description:
      "BNO tracks ICE Brent crude futures — the global oil benchmark. For East Coast fuel buyers and any business with international fuel exposure, Brent often tracks retail fuel more closely than WTI (USO). Lower liquidity but tighter Brent-USD correlation.",
    best_for: [
      "East Coast retail gasoline tracking (often Brent-linked)",
      "International fuel buyers (shipping, aviation support)",
      "Diversification against WTI-specific basis risk",
    ],
    risks: [
      "Lower options liquidity than UGA or USO",
      "K-1 tax form",
      "Brent vs WTI spread can widen — basis risk",
      "Lighter overall ADV; bid/ask can widen during high vol",
    ],
  },
  UNL: {
    ticker: "UNL",
    name: "United States 12 Month Natural Gas Fund LP",
    issuer: "United States Commodity Funds",
    inception: "2009-11-18",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.009,
    aum_millions: 24,
    underlying: "Natural gas futures (NYMEX), rolled across nearest 12 months",
    underlying_exchange: "NYMEX",
    primary_fuel: "natural gas",
    correlation_to_retail: 0.72,
    liquidity_class: "Lower",
    avg_daily_volume_thousands: 28,
    options_available: true,
    options_avg_oi: "2K–6K contracts (thin)",
    default_iv: 0.42,
    weekly_decay_pct: 0.001,
    description:
      "UNL provides natural-gas exposure for businesses with significant heating-fuel costs (commercial bakeries, dry cleaners, manufacturers, greenhouses). The 12-month rolling structure smooths contango more than the front-month-only competitor (UNG). Liquidity is lower — size positions accordingly.",
    best_for: [
      "Businesses with natural-gas heating bills as a major cost",
      "Diversification beyond crude-/gasoline-linked ETFs",
      "Long-dated, slow-rebalance hedges",
    ],
    risks: [
      "Low options liquidity — wider spreads, harder to execute large size",
      "Higher implied volatility means richer premiums (cuts both ways)",
      "K-1 tax form",
      "Natural-gas prices are seasonally noisy — basis risk against retail",
    ],
  },
};

export const ETF_TICKERS = Object.keys(ETF_LIBRARY);

export function getEtfMeta(ticker: string): EtfMeta | null {
  return ETF_LIBRARY[ticker.toUpperCase()] ?? null;
}
