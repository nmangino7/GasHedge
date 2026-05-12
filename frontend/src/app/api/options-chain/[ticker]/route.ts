import { NextRequest } from "next/server";
import { getOptionsChain, findExpiryByDays } from "@/lib/yahoo-options";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const targetDays = request.nextUrl.searchParams.get("days_to_expiry");
  try {
    const chain = await getOptionsChain(ticker);
    if (targetDays) {
      const expiry = findExpiryByDays(chain, Number(targetDays));
      return Response.json({
        symbol: chain.symbol,
        underlyingPrice: chain.underlyingPrice,
        expiry,
        availableExpirations: chain.expirations.map((e) => ({
          expirationDate: e.expirationDate,
          daysToExpiry: e.daysToExpiry,
        })),
        as_of: chain.asOf,
      });
    }
    return Response.json(chain);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
