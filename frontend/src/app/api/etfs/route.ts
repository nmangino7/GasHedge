import { ETF_LIBRARY, ETF_TICKERS } from "@/lib/etf-library";
import { getMultipleQuotes } from "@/lib/yahoo-options";

export async function GET() {
  let quotes: Record<string, { price: number; change: number; changePct: number; previousClose: number; asOf: string }> = {};
  try {
    const raw = await getMultipleQuotes(ETF_TICKERS);
    quotes = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [
        k,
        {
          price: v.price,
          change: v.change,
          changePct: v.changePct,
          previousClose: v.previousClose,
          asOf: v.asOf,
        },
      ])
    );
  } catch {
    // fall through with empty quotes
  }
  const etfs = ETF_TICKERS.map((t) => ({
    ...ETF_LIBRARY[t],
    quote: quotes[t] ?? null,
  }));
  return Response.json({ etfs, as_of: new Date().toISOString() });
}
