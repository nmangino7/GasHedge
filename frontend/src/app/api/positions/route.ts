import { NextRequest } from "next/server";
import { optionPositionStore, type OptionPositionStatus } from "@/lib/store";
import type { OptionPositionCreateInput } from "@/lib/store-types";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const dealId = url.searchParams.get("deal_id");
  const companyId = url.searchParams.get("company_id");
  const status = url.searchParams.get("status") as OptionPositionStatus | null;
  const positions = await optionPositionStore.list({
    dealId: dealId ? Number(dealId) : undefined,
    companyId: companyId ? Number(companyId) : undefined,
    status: status ?? undefined,
  });
  return Response.json({ positions });
}

export async function POST(request: NextRequest) {
  let body: Partial<OptionPositionCreateInput>;
  try {
    body = (await request.json()) as Partial<OptionPositionCreateInput>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required: (keyof OptionPositionCreateInput)[] = [
    "deal_id", "strategy_key", "ticker", "option_type", "side",
    "strike", "expiry", "contracts",
    "entry_premium_per_share", "entry_underlying_price",
  ];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null) {
      return Response.json({ error: `Missing field: ${k}` }, { status: 400 });
    }
  }

  if (body.option_type !== "call" && body.option_type !== "put") {
    return Response.json({ error: "option_type must be 'call' or 'put'" }, { status: 400 });
  }
  if (body.side !== "long" && body.side !== "short") {
    return Response.json({ error: "side must be 'long' or 'short'" }, { status: 400 });
  }

  try {
    const position = await optionPositionStore.create(body as OptionPositionCreateInput);
    return Response.json({ position }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
