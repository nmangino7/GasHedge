import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface QuoteSnapshot {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  previousClose: number;
  marketState: string;
  asOf: string;
}

export interface OptionsChainExpiry {
  expirationDate: string; // YYYY-MM-DD
  daysToExpiry: number;
  calls: OptionsContractRow[];
  puts: OptionsContractRow[];
}

export interface OptionsContractRow {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  inTheMoney: boolean;
}

export interface FullOptionsChain {
  symbol: string;
  underlyingPrice: number;
  expirations: OptionsChainExpiry[];
  asOf: string;
}

// Server-side memo cache. Keyed by symbol; refresh after TTL.
type CacheEntry<T> = { value: T; expiresAt: number };
const quoteCache = new Map<string, CacheEntry<QuoteSnapshot>>();
const chainCache = new Map<string, CacheEntry<FullOptionsChain>>();
const QUOTE_TTL_MS = 5 * 60 * 1000; // 5 minutes for live quotes
const CHAIN_TTL_MS = 60 * 60 * 1000; // 1 hour for options chains

function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getQuote(symbol: string): Promise<QuoteSnapshot> {
  const upper = symbol.toUpperCase();
  const cached = quoteCache.get(upper);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  // validateResult: false ⇒ we get an untyped result back. yahoo-finance2's strict
  // schema sometimes drops fields it considers nonstandard; we just take what's there.
  const q = (await yahooFinance.quote(upper, {}, { validateResult: false })) as Record<string, unknown>;
  const num = (k: string): number | undefined =>
    typeof q[k] === "number" ? (q[k] as number) : undefined;
  const price = num("regularMarketPrice") ?? num("postMarketPrice") ?? num("preMarketPrice") ?? 0;
  const previousClose = num("regularMarketPreviousClose") ?? price;
  const change = num("regularMarketChange") ?? price - previousClose;
  const changePct =
    num("regularMarketChangePercent") ?? (previousClose > 0 ? (change / previousClose) * 100 : 0);
  const snap: QuoteSnapshot = {
    symbol: upper,
    price,
    change,
    changePct,
    previousClose,
    marketState: typeof q.marketState === "string" ? (q.marketState as string) : "UNKNOWN",
    asOf: new Date().toISOString(),
  };
  quoteCache.set(upper, { value: snap, expiresAt: Date.now() + QUOTE_TTL_MS });
  return snap;
}

export async function getMultipleQuotes(symbols: string[]): Promise<Record<string, QuoteSnapshot>> {
  const out: Record<string, QuoteSnapshot> = {};
  await Promise.all(
    symbols.map(async (s) => {
      try {
        out[s.toUpperCase()] = await getQuote(s);
      } catch (err) {
        // Yahoo can hiccup — surface but don't poison the whole batch
        console.error(`yahoo getQuote(${s}) failed:`, err);
      }
    })
  );
  return out;
}

export async function getOptionsChain(
  symbol: string,
  opts: { expirationDate?: Date } = {}
): Promise<FullOptionsChain> {
  const upper = symbol.toUpperCase();
  const key = `${upper}:${opts.expirationDate?.toISOString() ?? "all"}`;
  const cached = chainCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const raw = (await yahooFinance.options(
    upper,
    opts.expirationDate ? { date: opts.expirationDate } : undefined,
    { validateResult: false }
  )) as {
    quote: { regularMarketPrice?: number };
    options: Array<{ expirationDate: Date | string; calls: unknown[]; puts: unknown[] }>;
  };
  const now = new Date();
  const expirations: OptionsChainExpiry[] = raw.options.map((exp) => {
    const expDate = new Date(exp.expirationDate);
    return {
      expirationDate: isoDate(expDate),
      daysToExpiry: dayDiff(now, expDate),
      calls: (exp.calls as Parameters<typeof rowToContract>[0][]).map(rowToContract),
      puts: (exp.puts as Parameters<typeof rowToContract>[0][]).map(rowToContract),
    };
  });

  const chain: FullOptionsChain = {
    symbol: upper,
    underlyingPrice: raw.quote.regularMarketPrice ?? 0,
    expirations,
    asOf: now.toISOString(),
  };
  chainCache.set(key, { value: chain, expiresAt: Date.now() + CHAIN_TTL_MS });
  return chain;
}

function rowToContract(r: {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid?: number;
  ask?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  inTheMoney: boolean;
}): OptionsContractRow {
  const bid = typeof r.bid === "number" ? r.bid : null;
  const ask = typeof r.ask === "number" ? r.ask : null;
  const mid = bid !== null && ask !== null && bid > 0 && ask > 0 ? (bid + ask) / 2 : (r.lastPrice ?? null);
  return {
    contractSymbol: r.contractSymbol,
    strike: r.strike,
    lastPrice: r.lastPrice,
    bid,
    ask,
    mid,
    volume: r.volume ?? null,
    openInterest: r.openInterest ?? null,
    impliedVolatility: r.impliedVolatility ?? null,
    inTheMoney: r.inTheMoney,
  };
}

// Find the closest-strike contract on a given expiry (used by position entry flow)
export function findContractByStrike(
  expiry: OptionsChainExpiry,
  optionType: "call" | "put",
  targetStrike: number
): OptionsContractRow | undefined {
  const list = optionType === "call" ? expiry.calls : expiry.puts;
  if (list.length === 0) return undefined;
  return list.reduce((closest, c) =>
    Math.abs(c.strike - targetStrike) < Math.abs(closest.strike - targetStrike) ? c : closest
  );
}

// Pick the expiry nearest to a target days-out, used for strategy sizing
export function findExpiryByDays(chain: FullOptionsChain, targetDays: number): OptionsChainExpiry | undefined {
  if (chain.expirations.length === 0) return undefined;
  return chain.expirations.reduce((closest, e) =>
    Math.abs(e.daysToExpiry - targetDays) < Math.abs(closest.daysToExpiry - targetDays) ? e : closest
  );
}
