import { NextRequest } from "next/server";
import { getEtfMeta } from "@/lib/etf-library";
import { getQuote, getOptionsChain } from "@/lib/yahoo-options";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const meta = getEtfMeta(ticker);
  if (!meta) return Response.json({ error: "Unknown ticker" }, { status: 404 });

  const [quoteRes, chainRes] = await Promise.allSettled([
    getQuote(ticker),
    getOptionsChain(ticker),
  ]);
  const quote = quoteRes.status === "fulfilled" ? quoteRes.value : null;
  const chain = chainRes.status === "fulfilled" ? chainRes.value : null;

  // Summarize chain to keep payload small: count strikes per expiry + ATM IV
  let chainSummary: Array<{
    expirationDate: string;
    daysToExpiry: number;
    callCount: number;
    putCount: number;
    atmCallMid: number | null;
    atmPutMid: number | null;
    atmIv: number | null;
  }> = [];
  if (chain && chain.underlyingPrice > 0) {
    const spot = chain.underlyingPrice;
    chainSummary = chain.expirations.slice(0, 6).map((exp) => {
      const allOptions = [...exp.calls, ...exp.puts];
      const atmCall = exp.calls.reduce<(typeof exp.calls)[number] | null>(
        (closest, c) =>
          !closest || Math.abs(c.strike - spot) < Math.abs(closest.strike - spot) ? c : closest,
        null
      );
      const atmPut = exp.puts.reduce<(typeof exp.puts)[number] | null>(
        (closest, c) =>
          !closest || Math.abs(c.strike - spot) < Math.abs(closest.strike - spot) ? c : closest,
        null
      );
      const ivs = allOptions
        .map((o) => o.impliedVolatility)
        .filter((v): v is number => typeof v === "number" && v > 0);
      const atmIv =
        atmCall?.impliedVolatility ??
        atmPut?.impliedVolatility ??
        (ivs.length > 0 ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null);
      return {
        expirationDate: exp.expirationDate,
        daysToExpiry: exp.daysToExpiry,
        callCount: exp.calls.length,
        putCount: exp.puts.length,
        atmCallMid: atmCall?.mid ?? null,
        atmPutMid: atmPut?.mid ?? null,
        atmIv,
      };
    });
  }

  return Response.json({
    meta,
    quote,
    chainSummary,
    underlyingPrice: chain?.underlyingPrice ?? quote?.price ?? null,
    expirationCount: chain?.expirations.length ?? 0,
    as_of: new Date().toISOString(),
  });
}
