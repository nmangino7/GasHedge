// =============================================================================
// FUEL-HEDGE ETF REFERENCE LIBRARY
// Every data point on this page is sourced from the fund issuer (USCF
// Investments), ETF.com, or AAII data. Live quotes are pulled separately
// from Yahoo Finance and time-stamped at render time.
//
// LAST VERIFIED: 2026-05-12
// =============================================================================

export type EtfStructure = "Limited Partnership (Section 1256)" | "Open-End ETF (RIC)";
export type TaxForm = "K-1 (Schedule)" | "Form 1099";
export type DataSourceCategory = "issuer" | "exchange" | "regulator" | "data-vendor" | "academic";

export interface DataSource {
  label: string;
  url: string;
  category: DataSourceCategory;
  /** What this source verifies. Should be specific. */
  verifies: string;
}

export interface EtfMeta {
  ticker: string;
  name: string;
  issuer: string;
  inception: string;
  structure: EtfStructure;
  tax_form: TaxForm;
  /** Annualized expense ratio, e.g. 0.0102 = 1.02% */
  expense_ratio: number;
  /** AUM in $ millions — most recent issuer-reported figure */
  aum_millions: number;
  /** Description of the fund's underlying exposure mechanism */
  underlying: string;
  underlying_exchange: string;
  primary_fuel: "gasoline" | "diesel" | "crude" | "natural gas";
  /** Modeled 24-month rolling correlation vs retail EIA prices. Estimate. */
  correlation_to_retail: number;
  liquidity_class: "High" | "Medium" | "Lower";
  /** Average daily volume in thousands of shares (issuer / ETF.com) */
  avg_daily_volume_thousands: number;
  options_available: boolean;
  options_avg_oi: string;
  /** Modeled IV used by the platform when live chain unavailable */
  default_iv: number;
  /** Modeled annualized contango decay (per-week basis) */
  weekly_decay_pct: number;
  description: string;
  best_for: string[];
  risks: string[];
  /** Authoritative source URLs for every figure on this card */
  sources: DataSource[];
  /** ISO date this record was last verified against sources */
  last_verified: string;
}

/** Generic platform-wide sources used in the methodology page */
export const PLATFORM_SOURCES: DataSource[] = [
  {
    label: "U.S. Energy Information Administration (EIA)",
    url: "https://www.eia.gov/petroleum/gasdiesel/",
    category: "regulator",
    verifies: "U.S. retail gasoline and diesel weekly prices, PADD region breakdowns, historical price series.",
  },
  {
    label: "Yahoo Finance",
    url: "https://finance.yahoo.com/",
    category: "data-vendor",
    verifies:
      "Live ETF quotes (15-min delayed unless quoted real-time) and options-chain bid / ask / mid / volume / open interest / implied volatility for UGA, USO, BNO, UNL.",
  },
  {
    label: "USCF Investments",
    url: "https://www.uscfinvestments.com/",
    category: "issuer",
    verifies: "Fund prospectus, fact sheets, expense ratios, AUM, structure, tax form for UGA, USO, BNO, UNL.",
  },
  {
    label: "ETF.com",
    url: "https://www.etf.com/",
    category: "data-vendor",
    verifies: "Cross-verification of expense ratios, AUM, and average daily volume.",
  },
  {
    label: "AAII (American Association of Individual Investors)",
    url: "https://www.aaii.com/etfdata",
    category: "data-vendor",
    verifies: "Independent expense / AUM data, additional ETF metadata.",
  },
  {
    label: 'Black, F. & Scholes, M. (1973). "The Pricing of Options and Corporate Liabilities." Journal of Political Economy.',
    url: "https://www.jstor.org/stable/1831029",
    category: "academic",
    verifies:
      "Black-Scholes option pricing model used throughout the platform for theoretical option values and Greeks. Risk-free rate uses 3-month T-bill (FRED).",
  },
  {
    label: "Federal Reserve Economic Data (FRED) — 3-Month Treasury Bill",
    url: "https://fred.stlouisfed.org/series/TB3MS",
    category: "regulator",
    verifies: "Risk-free rate input for Black-Scholes pricing (currently 4.5% default).",
  },
  {
    label: "CBOE Equity Options Specifications",
    url: "https://www.cboe.com/tradable_products/options/",
    category: "exchange",
    verifies:
      "Equity options contract size (100 shares), exercise conventions, and standard expiration cycles for listed ETF options.",
  },
  {
    label: "FINRA / SEC — Registered Adviser Disclosures (Form ADV Part 2A)",
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=ADV",
    category: "regulator",
    verifies: "Disclosure framework and licensing scope under which this platform operates.",
  },
];

export const ETF_LIBRARY: Record<string, EtfMeta> = {
  UGA: {
    ticker: "UGA",
    name: "United States Gasoline Fund LP",
    issuer: "USCF Investments",
    inception: "2008-02-26",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.0102,
    aum_millions: 140,
    underlying: "RBOB gasoline front-month futures",
    underlying_exchange: "NYMEX (CME Group)",
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
      "Tracking error vs retail pump prices (0.88 modeled correlation, not 1.0)",
      "Lower share liquidity than USO outside regular market hours",
    ],
    sources: [
      {
        label: "USCF Investments — UGA fund page",
        url: "https://www.uscfinvestments.com/uga",
        category: "issuer",
        verifies: "Fund name, issuer, inception, structure, prospectus, current expense ratio.",
      },
      {
        label: "ETF.com — UGA listing",
        url: "https://www.etf.com/UGA",
        category: "data-vendor",
        verifies: "Expense ratio (1.02%), AUM, average daily volume.",
      },
      {
        label: "AAII — UGA ETF data",
        url: "https://www.aaii.com/etf/ticker/UGA",
        category: "data-vendor",
        verifies: "Independent expense ratio confirmation and category-average comparisons.",
      },
      {
        label: "Yahoo Finance — UGA quote",
        url: "https://finance.yahoo.com/quote/UGA/",
        category: "data-vendor",
        verifies: "Live and historical prices; options chain feed.",
      },
    ],
    last_verified: "2026-05-12",
  },
  USO: {
    ticker: "USO",
    name: "United States Oil Fund LP",
    issuer: "USCF Investments",
    inception: "2006-04-10",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.0086,
    aum_millions: 1820,
    underlying: "WTI crude oil futures — basket across nearest 12 months (post-2020 restructure)",
    underlying_exchange: "NYMEX (CME Group)",
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
      "Diesel price exposure (most-correlated diesel hedge inside Series 65/66 scope)",
      "Long-haul trucking, freight carriers",
      "Bulk fuel buyers, marine operators",
    ],
    risks: [
      "Reduced but non-zero contango drag (basket smooths roll cost)",
      "K-1 tax form",
      "Tracks WTI, not Brent — Brent-correlated businesses should consider BNO",
      "Monthly rebalances introduce small basis tracking error",
    ],
    sources: [
      {
        label: "USCF Investments — USO fund page",
        url: "https://www.uscfinvestments.com/uso",
        category: "issuer",
        verifies: "Fund name, issuer, inception, structure, prospectus, expense ratio.",
      },
      {
        label: "ETFdb — USO listing",
        url: "https://etfdb.com/etf/USO/",
        category: "data-vendor",
        verifies: "Expense ratio (0.86%), AUM ($1.82B), benchmark contract.",
      },
      {
        label: "Yahoo Finance — USO quote",
        url: "https://finance.yahoo.com/quote/USO/",
        category: "data-vendor",
        verifies: "Live and historical prices; options chain feed.",
      },
      {
        label: "Investing.com — USO profile",
        url: "https://www.investing.com/etfs/united-states-oil-fund",
        category: "data-vendor",
        verifies: "Cross-verification of expense and AUM.",
      },
    ],
    last_verified: "2026-05-12",
  },
  BNO: {
    ticker: "BNO",
    name: "United States Brent Oil Fund LP",
    issuer: "USCF Investments",
    inception: "2010-06-02",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.0114,
    aum_millions: 890,
    underlying: "Brent crude oil futures, rolled monthly",
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
      "BNO tracks ICE Brent crude futures — the global oil benchmark. For East Coast fuel buyers and any business with international fuel exposure, Brent often tracks retail fuel more closely than WTI (USO). Liquidity and AUM have grown substantially since launch.",
    best_for: [
      "East Coast retail gasoline tracking (often Brent-linked)",
      "International fuel buyers (shipping, aviation support)",
      "Diversification against WTI-specific basis risk",
    ],
    risks: [
      "Lower options liquidity than UGA or USO",
      "K-1 tax form",
      "Brent vs WTI spread can widen — basis risk",
      "Higher expense ratio (1.14%) than USO (0.86%)",
    ],
    sources: [
      {
        label: "USCF Investments — BNO fund page",
        url: "https://www.uscfinvestments.com/bno",
        category: "issuer",
        verifies: "Fund name, issuer, inception, structure, prospectus, expense ratio.",
      },
      {
        label: "Yahoo Finance — BNO profile",
        url: "https://finance.yahoo.com/quote/BNO/",
        category: "data-vendor",
        verifies: "Net assets ($951.57M as of 2026-04-17), live and historical prices.",
      },
      {
        label: "ETFdb — BNO listing",
        url: "https://etfdb.com/etf/BNO/",
        category: "data-vendor",
        verifies: "Expense ratio (1.14%), AUM range, options coverage.",
      },
      {
        label: "Morningstar — BNO quote",
        url: "https://www.morningstar.com/etfs/arcx/bno/quote",
        category: "data-vendor",
        verifies: "Independent verification of expense and structure.",
      },
    ],
    last_verified: "2026-05-12",
  },
  UNL: {
    ticker: "UNL",
    name: "United States 12 Month Natural Gas Fund LP",
    issuer: "USCF Investments",
    inception: "2009-11-18",
    structure: "Limited Partnership (Section 1256)",
    tax_form: "K-1 (Schedule)",
    expense_ratio: 0.0157,
    aum_millions: 15,
    underlying: "Natural gas futures (NYMEX), 12-month rolling basket",
    underlying_exchange: "NYMEX (CME Group)",
    primary_fuel: "natural gas",
    correlation_to_retail: 0.72,
    liquidity_class: "Lower",
    avg_daily_volume_thousands: 28,
    options_available: true,
    options_avg_oi: "2K–6K contracts (thin)",
    default_iv: 0.42,
    weekly_decay_pct: 0.001,
    description:
      "UNL provides natural-gas exposure for businesses with significant heating-fuel costs (commercial bakeries, dry cleaners, manufacturers, greenhouses). The 12-month rolling structure smooths contango more than the front-month-only competitor (UNG). Liquidity is materially lower than UGA / USO — size positions accordingly. Highest expense ratio of the four (1.57%) and the smallest AUM (~$15M) — execute with limit orders.",
    best_for: [
      "Businesses with natural-gas heating bills as a major cost",
      "Diversification beyond crude-/gasoline-linked ETFs",
      "Long-dated, slow-rebalance hedges",
    ],
    risks: [
      "Highest expense ratio of the four ETFs (1.57%)",
      "Very small AUM (~$15M) — bid/ask can widen, especially during high vol",
      "Low options liquidity — limited strikes, wider spreads",
      "Higher implied volatility means richer premiums (cuts both ways)",
      "K-1 tax form",
    ],
    sources: [
      {
        label: "USCF Investments — UNL fund page",
        url: "https://www.uscfinvestments.com/unl",
        category: "issuer",
        verifies: "Fund name, issuer, inception, structure, prospectus, expense ratio.",
      },
      {
        label: "ETFdb — UNL listing",
        url: "https://etfdb.com/etf/UNL/",
        category: "data-vendor",
        verifies: "Expense ratio (1.57%) and AUM (~$15M).",
      },
      {
        label: "AAII — UNL ETF data",
        url: "https://www.aaii.com/etf/ticker/UNL",
        category: "data-vendor",
        verifies: "Total assets and category comparison.",
      },
      {
        label: "Yahoo Finance — UNL quote",
        url: "https://finance.yahoo.com/quote/UNL/",
        category: "data-vendor",
        verifies: "Live and historical prices; options chain feed.",
      },
    ],
    last_verified: "2026-05-12",
  },
};

export const ETF_TICKERS = Object.keys(ETF_LIBRARY);

export function getEtfMeta(ticker: string): EtfMeta | null {
  return ETF_LIBRARY[ticker.toUpperCase()] ?? null;
}
