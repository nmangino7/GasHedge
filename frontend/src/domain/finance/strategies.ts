// The eight ETF option strategies the advisor can recommend (Series 65/66
// scope — listed equity options, client executes via their broker).
//
// These are pure builders: pricing comes from Black-Scholes and the contract
// count is supplied by the caller (sized via hedge-ratio.ts, so the corrected
// beta sizing flows through). No hidden default lookups, no I/O.

import { priceAndGreeks } from "./greeks";
import { ETF_NAMES } from "./constants";

export type OptionType = "call" | "put";
export type OptionSide = "long" | "short";

export type StrategyKey =
  | "long_call"
  | "long_put"
  | "covered_call"
  | "short_put"
  | "collar"
  | "bull_call_spread"
  | "bear_put_spread"
  | "iron_condor";

export interface OptionLeg {
  side: OptionSide;
  optionType: OptionType;
  strike: number;
  premiumPerShare: number;
  contracts: number;
  delta: number;
  gamma: number;
  thetaPerDay: number;
  vega: number;
  ivUsed: number;
}

export interface StrategyResult {
  strategyKey: StrategyKey;
  displayName: string;
  ticker: string;
  fuelType: string;
  expiryDays: number;
  underlyingPrice: number;
  contracts: number;
  /** Signed: positive = debit (you pay), negative = credit (you receive). */
  totalPremium: number;
  totalPremiumLabel: string;
  maxLoss: number | "Unlimited" | "ETF can fall to $0";
  maxGain: number | "Unlimited";
  breakevenEtfPrice: number | null;
  netDelta: number;
  /** 0–1 score of how well this matches a fuel-cost hedge use case. */
  hedgeFit: number;
  sharesRequired?: number;
  cashRequired?: number;
  legs: OptionLeg[];
  description: string;
  bestFor: string;
  rationale: string;
}

export interface StrategyInput {
  ticker: string;
  fuelType: string;
  etfPrice: number;
  /** Pre-sized contract count (>= 1), from hedge-ratio.ts. */
  contracts: number;
  /** Implied volatility to price with. */
  iv: number;
  riskFreeRate: number;
  daysToExpiry: number;
  /** ATM=1.0, 1.05 = 5% OTM call, 0.95 = 5% OTM put. Strategy-specific default. */
  strikeMoneyness?: number;
}

const CONTRACT_MULTIPLIER = 100;

function price(spot: number, strike: number, iv: number, days: number, rfr: number) {
  return priceAndGreeks({
    spot,
    strike,
    timeToExpiryYears: days / 365.25,
    volatility: iv,
    riskFreeRate: rfr,
  });
}

function fullName(ticker: string): string {
  return ETF_NAMES[ticker] ?? ticker;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
function money(x: number): string {
  return `$${Math.round(x).toLocaleString()}`;
}
function plural(n: number): string {
  return n === 1 ? "" : "s";
}

export function longCall(i: StrategyInput): StrategyResult {
  const moneyness = i.strikeMoneyness ?? 1.0;
  const strike = round2(i.etfPrice * moneyness);
  const bs = price(i.etfPrice, strike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const premium = bs.callPrice;
  const totalPremium = premium * CONTRACT_MULTIPLIER * i.contracts;
  const breakeven = strike + premium;
  return {
    strategyKey: "long_call",
    displayName: "Long Call (Upside Protection)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: round2(totalPremium),
    totalPremiumLabel: `${money(totalPremium)} debit`,
    maxLoss: round2(totalPremium),
    maxGain: "Unlimited",
    breakevenEtfPrice: round2(breakeven),
    netDelta: round4(bs.callDelta * i.contracts * CONTRACT_MULTIPLIER),
    hedgeFit: 0.95,
    legs: [
      leg("long", "call", strike, bs.callPrice, i.contracts, bs.callDelta, bs.gamma, bs.callTheta, bs.vega, i.iv),
    ],
    description: `Buy ${i.contracts} ${i.ticker} $${strike.toFixed(2)} call${plural(i.contracts)} expiring in ~${i.daysToExpiry} days for ${money(totalPremium)}. Profits dollar-for-dollar above $${breakeven.toFixed(2)}; max loss is the premium if ${i.ticker} stays below $${strike.toFixed(2)}.`,
    bestFor: "Small fleets wanting upside protection against a fuel-price spike with strictly capped downside.",
    rationale: `${fullName(i.ticker)} closely tracks ${i.fuelType}. If ${i.fuelType} spikes, ${i.ticker} rises and the call's intrinsic value offsets the higher fuel bill. The premium is the insurance cost — fully predictable.`,
  };
}

export function longPut(i: StrategyInput): StrategyResult {
  const moneyness = i.strikeMoneyness ?? 1.0;
  const strike = round2(i.etfPrice * moneyness);
  const bs = price(i.etfPrice, strike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const premium = bs.putPrice;
  const totalPremium = premium * CONTRACT_MULTIPLIER * i.contracts;
  const breakeven = strike - premium;
  return {
    strategyKey: "long_put",
    displayName: "Long Put (Downside Protection on ETF)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: round2(totalPremium),
    totalPremiumLabel: `${money(totalPremium)} debit`,
    maxLoss: round2(totalPremium),
    maxGain: round2(strike * CONTRACT_MULTIPLIER * i.contracts - totalPremium),
    breakevenEtfPrice: round2(breakeven),
    netDelta: round4(bs.putDelta * i.contracts * CONTRACT_MULTIPLIER),
    hedgeFit: 0.25,
    legs: [
      leg("long", "put", strike, bs.putPrice, i.contracts, bs.putDelta, bs.gamma, bs.putTheta, bs.vega, i.iv),
    ],
    description: `Buy ${i.contracts} ${i.ticker} $${strike.toFixed(2)} put${plural(i.contracts)} (~${i.daysToExpiry} days) for ${money(totalPremium)}. Profits below $${breakeven.toFixed(2)}.`,
    bestFor: "Clients who already hold the ETF and want downside protection without selling.",
    rationale: "A long put isn't a fuel hedge by itself — it protects an existing ETF position from a price drop. Useful as an overlay if a client owns the ETF outright.",
  };
}

export function coveredCall(i: StrategyInput): StrategyResult {
  const moneyness = i.strikeMoneyness ?? 1.05;
  const strike = round2(i.etfPrice * moneyness);
  const shares = i.contracts * CONTRACT_MULTIPLIER;
  const bs = price(i.etfPrice, strike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const credit = bs.callPrice * shares;
  return {
    strategyKey: "covered_call",
    displayName: "Covered Call (Income on ETF Holding)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: -round2(credit),
    totalPremiumLabel: `${money(credit)} credit`,
    maxLoss: "ETF can fall to $0",
    maxGain: round2((strike - i.etfPrice) * shares + credit),
    breakevenEtfPrice: round2(i.etfPrice - bs.callPrice),
    netDelta: round4((1 - bs.callDelta) * shares),
    hedgeFit: 0.55,
    sharesRequired: shares,
    legs: [
      leg("short", "call", strike, bs.callPrice, i.contracts, -bs.callDelta, -bs.gamma, -bs.callTheta, -bs.vega, i.iv),
    ],
    description: `Own ${shares.toLocaleString()} shares of ${i.ticker} (≈${money(i.etfPrice * shares)}) and sell ${i.contracts} $${strike.toFixed(2)} call${plural(i.contracts)} (~${i.daysToExpiry} days). Collects ${money(credit)}. Upside capped at $${strike.toFixed(2)}.`,
    bestFor: "Clients holding the ETF as a hedge who want income and accept a capped upside.",
    rationale: "Layered on an outright ETF hedge, covered calls turn a static position into one that generates monthly premium. Best when fuel looks range-bound.",
  };
}

export function shortPut(i: StrategyInput): StrategyResult {
  const moneyness = i.strikeMoneyness ?? 0.95;
  const strike = round2(i.etfPrice * moneyness);
  const bs = price(i.etfPrice, strike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const credit = bs.putPrice * CONTRACT_MULTIPLIER * i.contracts;
  const cashRequired = strike * CONTRACT_MULTIPLIER * i.contracts;
  return {
    strategyKey: "short_put",
    displayName: "Cash-Secured Short Put (Acquire ETF Cheaper)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: -round2(credit),
    totalPremiumLabel: `${money(credit)} credit`,
    maxLoss: round2(cashRequired - credit),
    maxGain: round2(credit),
    breakevenEtfPrice: round2(strike - bs.putPrice),
    netDelta: round4(-bs.putDelta * i.contracts * CONTRACT_MULTIPLIER),
    hedgeFit: 0.4,
    cashRequired: round2(cashRequired),
    legs: [
      leg("short", "put", strike, bs.putPrice, i.contracts, -bs.putDelta, -bs.gamma, -bs.putTheta, -bs.vega, i.iv),
    ],
    description: `Sell ${i.contracts} ${i.ticker} $${strike.toFixed(2)} put${plural(i.contracts)} (~${i.daysToExpiry} days), collecting ${money(credit)}. Cash collateral ${money(cashRequired)}. If assigned, effective entry is $${(strike - bs.putPrice).toFixed(2)}.`,
    bestFor: "Clients who plan to build a long-term ETF hedge and want to get paid to wait for a pullback.",
    rationale: "If you want to be long the ETF anyway, selling cash-secured puts pays you to set a buy limit below the market. Assigned → lower basis; not assigned → keep the premium.",
  };
}

export function collar(i: StrategyInput): StrategyResult {
  const callStrike = round2(i.etfPrice * 1.08);
  const putStrike = round2(i.etfPrice * 0.92);
  const shares = i.contracts * CONTRACT_MULTIPLIER;
  const bsCall = price(i.etfPrice, callStrike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const bsPut = price(i.etfPrice, putStrike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const callCredit = bsCall.callPrice * shares;
  const putDebit = bsPut.putPrice * shares;
  const netDebit = putDebit - callCredit;
  return {
    strategyKey: "collar",
    displayName: "Collar (Bracket the ETF: Floor + Ceiling)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: round2(netDebit),
    totalPremiumLabel: netDebit >= 0 ? `${money(netDebit)} net debit` : `${money(-netDebit)} net credit`,
    maxLoss: round2((i.etfPrice - putStrike) * shares + netDebit),
    maxGain: round2((callStrike - i.etfPrice) * shares - netDebit),
    breakevenEtfPrice: round2(i.etfPrice + netDebit / shares),
    netDelta: round4(shares - bsCall.callDelta * shares + bsPut.putDelta * shares),
    hedgeFit: 0.75,
    sharesRequired: shares,
    legs: [
      leg("long", "put", putStrike, bsPut.putPrice, i.contracts, bsPut.putDelta, bsPut.gamma, bsPut.putTheta, bsPut.vega, i.iv),
      leg("short", "call", callStrike, bsCall.callPrice, i.contracts, -bsCall.callDelta, -bsCall.gamma, -bsCall.callTheta, -bsCall.vega, i.iv),
    ],
    description: `Own ${shares.toLocaleString()} shares of ${i.ticker}. Buy ${i.contracts} $${putStrike.toFixed(2)} put${plural(i.contracts)} for a floor + sell ${i.contracts} $${callStrike.toFixed(2)} call${plural(i.contracts)} to finance it. Net ${netDebit >= 0 ? "cost" : "credit"} ${money(Math.abs(netDebit))}. ETF locked between $${putStrike.toFixed(2)} and $${callStrike.toFixed(2)}.`,
    bestFor: "Clients who own the ETF and want bracketed exposure — limited downside, capped upside, near-zero cost.",
    rationale: "A collar gives a known worst-case: the put guarantees a floor while the short call finances most of its cost. The most popular structure for risk-averse owners.",
  };
}

export function bullCallSpread(i: StrategyInput): StrategyResult {
  const longStrike = round2(i.etfPrice * 1.0);
  const shortStrike = round2(i.etfPrice * 1.12);
  const bsLong = price(i.etfPrice, longStrike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const bsShort = price(i.etfPrice, shortStrike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const longDebit = bsLong.callPrice * CONTRACT_MULTIPLIER * i.contracts;
  const shortCredit = bsShort.callPrice * CONTRACT_MULTIPLIER * i.contracts;
  const netDebit = longDebit - shortCredit;
  const maxGain = (shortStrike - longStrike) * CONTRACT_MULTIPLIER * i.contracts - netDebit;
  return {
    strategyKey: "bull_call_spread",
    displayName: "Bull Call Spread (Capped Upside, Lower Cost)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: round2(netDebit),
    totalPremiumLabel: `${money(netDebit)} net debit`,
    maxLoss: round2(netDebit),
    maxGain: round2(maxGain),
    breakevenEtfPrice: round2(longStrike + netDebit / (CONTRACT_MULTIPLIER * i.contracts)),
    netDelta: round4((bsLong.callDelta - bsShort.callDelta) * i.contracts * CONTRACT_MULTIPLIER),
    hedgeFit: 0.85,
    legs: [
      leg("long", "call", longStrike, bsLong.callPrice, i.contracts, bsLong.callDelta, bsLong.gamma, bsLong.callTheta, bsLong.vega, i.iv),
      leg("short", "call", shortStrike, bsShort.callPrice, i.contracts, -bsShort.callDelta, -bsShort.gamma, -bsShort.callTheta, -bsShort.vega, i.iv),
    ],
    description: `Buy ${i.contracts} ${i.ticker} $${longStrike.toFixed(2)} call${plural(i.contracts)} + sell ${i.contracts} $${shortStrike.toFixed(2)} call${plural(i.contracts)} (~${i.daysToExpiry} days). Net debit ${money(netDebit)}. Profit capped at ${money(maxGain)}.`,
    bestFor: "Cost-sensitive clients expecting moderate — not runaway — fuel increases.",
    rationale: "Selling a further-OTM call cuts the long-call premium 40–60%. You trade rarely-needed unlimited upside for a much lower cost.",
  };
}

export function bearPutSpread(i: StrategyInput): StrategyResult {
  const longStrike = round2(i.etfPrice * 1.0);
  const shortStrike = round2(i.etfPrice * 0.88);
  const bsLong = price(i.etfPrice, longStrike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const bsShort = price(i.etfPrice, shortStrike, i.iv, i.daysToExpiry, i.riskFreeRate);
  const longDebit = bsLong.putPrice * CONTRACT_MULTIPLIER * i.contracts;
  const shortCredit = bsShort.putPrice * CONTRACT_MULTIPLIER * i.contracts;
  const netDebit = longDebit - shortCredit;
  const maxGain = (longStrike - shortStrike) * CONTRACT_MULTIPLIER * i.contracts - netDebit;
  return {
    strategyKey: "bear_put_spread",
    displayName: "Bear Put Spread (Defined-Range Downside Protection)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: round2(netDebit),
    totalPremiumLabel: `${money(netDebit)} net debit`,
    maxLoss: round2(netDebit),
    maxGain: round2(maxGain),
    breakevenEtfPrice: round2(longStrike - netDebit / (CONTRACT_MULTIPLIER * i.contracts)),
    netDelta: round4((bsLong.putDelta - bsShort.putDelta) * i.contracts * CONTRACT_MULTIPLIER),
    hedgeFit: 0.35,
    legs: [
      leg("long", "put", longStrike, bsLong.putPrice, i.contracts, bsLong.putDelta, bsLong.gamma, bsLong.putTheta, bsLong.vega, i.iv),
      leg("short", "put", shortStrike, bsShort.putPrice, i.contracts, -bsShort.putDelta, -bsShort.gamma, -bsShort.putTheta, -bsShort.vega, i.iv),
    ],
    description: `Buy ${i.contracts} ${i.ticker} $${longStrike.toFixed(2)} put${plural(i.contracts)} + sell ${i.contracts} $${shortStrike.toFixed(2)} put${plural(i.contracts)} (~${i.daysToExpiry} days). Net debit ${money(netDebit)}. Protects between $${longStrike.toFixed(2)} and $${shortStrike.toFixed(2)}.`,
    bestFor: "Clients who own the ETF and want defined-range downside protection cheaply.",
    rationale: "Cheaper than a long put; gives meaningful protection across the realistic worst-case band for the underlying.",
  };
}

export function ironCondor(i: StrategyInput): StrategyResult {
  const putShort = round2(i.etfPrice * 0.92);
  const putLong = round2(i.etfPrice * 0.85);
  const callShort = round2(i.etfPrice * 1.08);
  const callLong = round2(i.etfPrice * 1.15);
  const bsPutShort = price(i.etfPrice, putShort, i.iv, i.daysToExpiry, i.riskFreeRate);
  const bsPutLong = price(i.etfPrice, putLong, i.iv, i.daysToExpiry, i.riskFreeRate);
  const bsCallShort = price(i.etfPrice, callShort, i.iv, i.daysToExpiry, i.riskFreeRate);
  const bsCallLong = price(i.etfPrice, callLong, i.iv, i.daysToExpiry, i.riskFreeRate);
  const credit =
    (bsPutShort.putPrice - bsPutLong.putPrice + bsCallShort.callPrice - bsCallLong.callPrice) *
    CONTRACT_MULTIPLIER *
    i.contracts;
  const putWidth = (putShort - putLong) * CONTRACT_MULTIPLIER * i.contracts;
  const callWidth = (callLong - callShort) * CONTRACT_MULTIPLIER * i.contracts;
  const maxLoss = Math.max(putWidth, callWidth) - credit;
  return {
    strategyKey: "iron_condor",
    displayName: "Iron Condor (Range-Bound Income)",
    ticker: i.ticker,
    fuelType: i.fuelType,
    expiryDays: i.daysToExpiry,
    underlyingPrice: i.etfPrice,
    contracts: i.contracts,
    totalPremium: -round2(credit),
    totalPremiumLabel: `${money(credit)} net credit`,
    maxLoss: round2(maxLoss),
    maxGain: round2(credit),
    breakevenEtfPrice: null,
    netDelta: round4(
      (bsPutLong.putDelta - bsPutShort.putDelta - bsCallShort.callDelta + bsCallLong.callDelta) *
        i.contracts *
        CONTRACT_MULTIPLIER
    ),
    hedgeFit: 0.45,
    legs: [
      leg("long", "put", putLong, bsPutLong.putPrice, i.contracts, bsPutLong.putDelta, bsPutLong.gamma, bsPutLong.putTheta, bsPutLong.vega, i.iv),
      leg("short", "put", putShort, bsPutShort.putPrice, i.contracts, -bsPutShort.putDelta, -bsPutShort.gamma, -bsPutShort.putTheta, -bsPutShort.vega, i.iv),
      leg("short", "call", callShort, bsCallShort.callPrice, i.contracts, -bsCallShort.callDelta, -bsCallShort.gamma, -bsCallShort.callTheta, -bsCallShort.vega, i.iv),
      leg("long", "call", callLong, bsCallLong.callPrice, i.contracts, bsCallLong.callDelta, bsCallLong.gamma, bsCallLong.callTheta, bsCallLong.vega, i.iv),
    ],
    description: `Sell ${i.contracts} ${i.ticker} $${putShort.toFixed(2)}/$${putLong.toFixed(2)} put spread + $${callShort.toFixed(2)}/$${callLong.toFixed(2)} call spread (~${i.daysToExpiry} days). Collects ${money(credit)}. Profitable if ${i.ticker} stays between $${putShort.toFixed(2)} and $${callShort.toFixed(2)}.`,
    bestFor: "Income when the advisor has a defined-range view on fuel prices.",
    rationale: "A four-leg, defined-risk income trade: collect premium, profit if the ETF stays in the middle, capped loss on either side. Best when implied vol is rich.",
  };
}

const BUILDERS: Record<StrategyKey, (i: StrategyInput) => StrategyResult> = {
  long_call: longCall,
  long_put: longPut,
  covered_call: coveredCall,
  short_put: shortPut,
  collar,
  bull_call_spread: bullCallSpread,
  bear_put_spread: bearPutSpread,
  iron_condor: ironCondor,
};

export function buildStrategy(key: StrategyKey, input: StrategyInput): StrategyResult {
  return BUILDERS[key](input);
}

/** Build the standard advisor lineup with sensible per-strategy expiries/strikes. */
export function buildStrategyLineup(
  base: Omit<StrategyInput, "daysToExpiry" | "strikeMoneyness">
): StrategyResult[] {
  return [
    longCall({ ...base, daysToExpiry: 120, strikeMoneyness: 1.0 }),
    bullCallSpread({ ...base, daysToExpiry: 120 }),
    collar({ ...base, daysToExpiry: 90 }),
    coveredCall({ ...base, daysToExpiry: 45, strikeMoneyness: 1.05 }),
    shortPut({ ...base, daysToExpiry: 45, strikeMoneyness: 0.95 }),
    bearPutSpread({ ...base, daysToExpiry: 90 }),
    longPut({ ...base, daysToExpiry: 120, strikeMoneyness: 1.0 }),
    ironCondor({ ...base, daysToExpiry: 45 }),
  ];
}

function leg(
  side: OptionSide,
  optionType: OptionType,
  strike: number,
  premiumPerShare: number,
  contracts: number,
  delta: number,
  gamma: number,
  thetaPerDay: number,
  vega: number,
  ivUsed: number
): OptionLeg {
  return {
    side,
    optionType,
    strike,
    premiumPerShare: round2(premiumPerShare),
    contracts,
    delta: round4(delta),
    gamma: round4(gamma),
    thetaPerDay: round4(thetaPerDay),
    vega: round4(vega),
    ivUsed,
  };
}
