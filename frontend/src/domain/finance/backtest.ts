// Historical backtest of an ETF fuel hedge.
//
// THE BUG WE ARE FIXING (v1):
//   v1 computed  hedgePnl = gallonsHedged · firstWeekFuelPrice · correlation ·
//   actualEtfReturn. The realized ETF return ALREADY embeds the fuel/ETF
//   relationship, so multiplying by `correlation` again double-counts it; and
//   anchoring the notional to the first week's fuel price is dimensionally wrong.
//
// THE FIX:
//   Fix a real ETF SHARE COUNT at t0 and value it at each period's ACTUAL ETF
//   price:  etfPnl_t = shares · (etfPrice_t − etfPrice_{t-1}). No correlation
//   factor. Basis risk emerges naturally from how realized fuel and realized ETF
//   moves diverge, and realized correlation / hedge effectiveness become OUTPUTS
//   computed from the data, not fudge inputs.
//
// Pure functions, no I/O.

export interface PricePoint {
  period: string;
  value: number;
}

export interface BacktestInputs {
  monthlyGallons: number;
  /** Fraction of consumption hedged (0.25 / 0.5 / 0.75). */
  coverageRatio: number;
  /** Beta hedge ratio used to size the ETF position at t0. */
  beta: number;
  /** Actual retail fuel prices over the window. */
  fuelSeries: PricePoint[];
  /** Actual ETF prices over the window. */
  etfSeries: PricePoint[];
}

export interface BacktestRow {
  date: string;
  fuelPrice: number;
  etfPrice: number;
  unhedgedCost: number;
  etfPnl: number;
  hedgedCost: number;
  cumulativeSavings: number;
}

export interface BacktestOutput {
  rows: BacktestRow[];
  totalUnhedged: number;
  totalHedged: number;
  totalSavings: number;
  savingsPct: number;
  periodCount: number;
  startDate: string | null;
  endDate: string | null;
  /** Pearson correlation of realized fuel vs ETF weekly returns. */
  realizedCorrelation: number;
  /** r² of that relationship — realized hedge effectiveness. */
  realizedHedgeEffectiveness: number;
  shares: number;
}

const WEEKS_PER_MONTH = 4.33;

export function runBacktest(i: BacktestInputs): BacktestOutput {
  const empty = emptyResult();
  if (!i.fuelSeries.length || !i.etfSeries.length) return empty;

  const fuelMap = new Map(i.fuelSeries.map((p) => [p.period, p.value]));
  const etfMap = new Map(i.etfSeries.map((p) => [p.period, p.value]));
  const dates = [...fuelMap.keys()].filter((d) => etfMap.has(d)).sort();
  if (dates.length < 2) return empty;

  const weeklyGallons = i.monthlyGallons / WEEKS_PER_MONTH;
  const gallonsHedged = weeklyGallons * i.coverageRatio;

  // Size the ETF SHARE COUNT once, at t0, from the dollar exposure being hedged
  // scaled by beta. This is the position the advisor actually holds.
  const fuelStart = fuelMap.get(dates[0])!;
  const etfStart = etfMap.get(dates[0])!;
  const fuelNotionalWeekly = gallonsHedged * fuelStart;
  const etfNotional = i.beta * fuelNotionalWeekly;
  const shares = etfStart > 0 ? etfNotional / etfStart : 0;

  const rows: BacktestRow[] = [];
  let totalUnhedged = 0;
  let totalHedged = 0;
  let cumulative = 0;
  const fuelReturns: number[] = [];
  const etfReturns: number[] = [];

  for (let k = 1; k < dates.length; k++) {
    const d = dates[k];
    const prev = dates[k - 1];
    const fuelPrice = fuelMap.get(d)!;
    const etfPrice = etfMap.get(d)!;
    const prevFuel = fuelMap.get(prev)!;
    const prevEtf = etfMap.get(prev)!;

    const unhedgedCost = weeklyGallons * fuelPrice;
    // The fix: real share P&L at the ACTUAL ETF price. No correlation factor.
    const etfPnl = shares * (etfPrice - prevEtf);
    const hedgedCost = unhedgedCost - etfPnl;
    const savings = unhedgedCost - hedgedCost; // = etfPnl
    cumulative += savings;
    totalUnhedged += unhedgedCost;
    totalHedged += hedgedCost;

    if (prevFuel > 0) fuelReturns.push((fuelPrice - prevFuel) / prevFuel);
    if (prevEtf > 0) etfReturns.push((etfPrice - prevEtf) / prevEtf);

    rows.push({
      date: d,
      fuelPrice: round3(fuelPrice),
      etfPrice: round2(etfPrice),
      unhedgedCost: round2(unhedgedCost),
      etfPnl: round2(etfPnl),
      hedgedCost: round2(hedgedCost),
      cumulativeSavings: round2(cumulative),
    });
  }

  const totalSavings = totalUnhedged - totalHedged;
  const realizedCorrelation = pearson(fuelReturns, etfReturns);

  return {
    rows,
    totalUnhedged: round2(totalUnhedged),
    totalHedged: round2(totalHedged),
    totalSavings: round2(totalSavings),
    savingsPct: totalUnhedged > 0 ? round2((totalSavings / totalUnhedged) * 100) : 0,
    periodCount: rows.length,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    realizedCorrelation: round4(realizedCorrelation),
    realizedHedgeEffectiveness: round4(realizedCorrelation * realizedCorrelation),
    shares: Math.round(shares),
  };
}

/** Pearson correlation of two equal-length return series. */
export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const x = a.slice(0, n);
  const y = b.slice(0, n);
  const mx = mean(x);
  const my = mean(y);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let k = 0; k < n; k++) {
    const dx = x[k] - mx;
    const dy = y[k] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  const denom = Math.sqrt(vx * vy);
  return denom > 0 ? cov / denom : 0;
}

function mean(xs: number[]): number {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function emptyResult(): BacktestOutput {
  return {
    rows: [],
    totalUnhedged: 0,
    totalHedged: 0,
    totalSavings: 0,
    savingsPct: 0,
    periodCount: 0,
    startDate: null,
    endDate: null,
    realizedCorrelation: 0,
    realizedHedgeEffectiveness: 0,
    shares: 0,
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
