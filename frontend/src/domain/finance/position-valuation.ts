// Mark-to-market valuation of a live option position (used by the tracker).
// Pure functions, no I/O.

import { priceAndGreeks } from "./greeks";
import { OptionType, OptionSide } from "./strategies";
import { DAYS_PER_YEAR } from "./constants";

export interface ValuePositionInputs {
  optionType: OptionType;
  side: OptionSide;
  strike: number;
  /** Years to expiry (>= 0). */
  timeToExpiryYears: number;
  contracts: number;
  entryPremiumPerShare: number;
  currentUnderlyingPrice: number;
  iv: number;
  riskFreeRate: number;
}

export interface PositionValue {
  currentUnderlyingPrice: number;
  currentOptionPricePerShare: number;
  /** Signed by side: positive if long, negative if short obligation. */
  currentTotalValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  daysToExpiry: number;
  /** Share-equivalent Greeks (contracts × 100 × per-share). */
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  intrinsicValuePerShare: number;
  timeValuePerShare: number;
}

const CONTRACT_MULTIPLIER = 100;

export function valuePosition(i: ValuePositionInputs): PositionValue {
  const years = Math.max(0, i.timeToExpiryYears);
  const bs = priceAndGreeks({
    spot: i.currentUnderlyingPrice,
    strike: i.strike,
    timeToExpiryYears: years,
    volatility: i.iv,
    riskFreeRate: i.riskFreeRate,
  });
  const pricePerShare = i.optionType === "call" ? bs.callPrice : bs.putPrice;
  const intrinsic =
    i.optionType === "call"
      ? Math.max(i.currentUnderlyingPrice - i.strike, 0)
      : Math.max(i.strike - i.currentUnderlyingPrice, 0);
  const timeValue = Math.max(0, pricePerShare - intrinsic);

  const sideMul = i.side === "long" ? 1 : -1;
  const units = CONTRACT_MULTIPLIER * i.contracts * sideMul;
  const entryCost = i.entryPremiumPerShare * CONTRACT_MULTIPLIER * i.contracts * sideMul;
  const currentValue = pricePerShare * CONTRACT_MULTIPLIER * i.contracts * sideMul;
  const pnl = currentValue - entryCost;

  const perShareDelta = i.optionType === "call" ? bs.callDelta : bs.putDelta;
  const perShareTheta = i.optionType === "call" ? bs.callTheta : bs.putTheta;

  return {
    currentUnderlyingPrice: round2(i.currentUnderlyingPrice),
    currentOptionPricePerShare: round2(pricePerShare),
    currentTotalValue: round2(currentValue),
    unrealizedPnl: round2(pnl),
    unrealizedPnlPct: Math.abs(entryCost) > 0 ? round2((pnl / Math.abs(entryCost)) * 100) : 0,
    daysToExpiry: Math.round(years * DAYS_PER_YEAR),
    delta: round4(perShareDelta * units),
    gamma: round4(bs.gamma * units),
    theta: round2(perShareTheta * units),
    vega: round2(bs.vega * units),
    intrinsicValuePerShare: round2(intrinsic),
    timeValuePerShare: round2(timeValue),
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
