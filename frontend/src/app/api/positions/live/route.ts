import { NextRequest } from "next/server";
import { optionPositionStore, companyStore } from "@/lib/store";
import { valueOptionPosition } from "@/lib/hedging-engine";
import { getMultipleQuotes } from "@/lib/yahoo-options";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const dealId = url.searchParams.get("deal_id");
  const companyIdParam = url.searchParams.get("company_id");

  const positions = await optionPositionStore.list({
    dealId: dealId ? Number(dealId) : undefined,
    companyId: companyIdParam ? Number(companyIdParam) : undefined,
    status: "open",
  });

  const uniqueTickers = [...new Set(positions.map((p) => p.ticker))];
  let quotes: Record<string, { price: number; change: number; changePct: number; previousClose: number; asOf: string }> = {};
  let quotesError: string | null = null;
  try {
    const raw = await getMultipleQuotes(uniqueTickers);
    quotes = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [
        k,
        { price: v.price, change: v.change, changePct: v.changePct, previousClose: v.previousClose, asOf: v.asOf },
      ])
    );
  } catch (err) {
    quotesError = err instanceof Error ? err.message : String(err);
  }

  // Fall back to the entry underlying price if Yahoo failed for that symbol — keeps the page usable.
  const enriched = positions.map((p) => {
    const quote = quotes[p.ticker];
    const currentUnderlying = quote?.price ?? p.entry_underlying_price;
    const live = valueOptionPosition({
      ticker: p.ticker,
      option_type: p.option_type,
      side: p.side,
      strike: p.strike,
      expiry: new Date(p.expiry),
      contracts: p.contracts,
      entry_premium_per_share: p.entry_premium_per_share,
      current_underlying_price: currentUnderlying,
      iv: p.iv_used ?? undefined,
    });
    return {
      ...p,
      live: { ...live, quote_stale: !quote, quote_change_pct: quote?.changePct ?? null },
    };
  });

  // Aggregate stats
  const totalEntry = positions.reduce(
    (acc, p) => acc + p.entry_premium_per_share * 100 * p.contracts * (p.side === "long" ? 1 : -1),
    0
  );
  const totalCurrent = enriched.reduce((acc, p) => acc + p.live.current_total_value, 0);
  const totalPnl = enriched.reduce((acc, p) => acc + p.live.unrealized_pnl, 0);
  const totalPnlPct = totalEntry !== 0 ? (totalPnl / Math.abs(totalEntry)) * 100 : 0;
  const portfolioDelta = enriched.reduce((acc, p) => acc + p.live.delta, 0);
  const portfolioGamma = enriched.reduce((acc, p) => acc + p.live.gamma, 0);
  const portfolioTheta = enriched.reduce((acc, p) => acc + p.live.theta, 0);
  const portfolioVega = enriched.reduce((acc, p) => acc + p.live.vega, 0);

  // Pull company names for display
  const companies = await companyStore.list();
  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const enrichedWithCompany = enriched.map((p) => ({
    ...p,
    company_name: companiesById.get(p.company_id)?.name ?? `Company ${p.company_id}`,
  }));

  return Response.json({
    positions: enrichedWithCompany,
    quotes,
    aggregate: {
      open_count: positions.length,
      total_entry_cost: Math.round(totalEntry * 100) / 100,
      total_current_value: Math.round(totalCurrent * 100) / 100,
      total_unrealized_pnl: Math.round(totalPnl * 100) / 100,
      total_unrealized_pnl_pct: Math.round(totalPnlPct * 100) / 100,
      tickers: uniqueTickers,
      portfolio_delta: Math.round(portfolioDelta),
      portfolio_gamma: Math.round(portfolioGamma * 100) / 100,
      portfolio_theta: Math.round(portfolioTheta * 100) / 100,
      portfolio_vega: Math.round(portfolioVega * 100) / 100,
    },
    quotes_error: quotesError,
    as_of: new Date().toISOString(),
  });
}
