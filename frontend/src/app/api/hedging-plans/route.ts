import { hedgingPlanStore, companyStore } from "@/lib/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("company_id");
  const plans = await hedgingPlanStore.list(
    companyId ? Number(companyId) : undefined
  );
  return Response.json(plans);
}

export async function POST(req: Request) {
  const data = await req.json();
  if (!data.company_id) {
    return Response.json({ error: "company_id is required" }, { status: 400 });
  }
  const company = await companyStore.get(Number(data.company_id));
  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }
  const plan = await hedgingPlanStore.create({
    company_id: Number(data.company_id),
    deal_id: data.deal_id ? Number(data.deal_id) : null,
    approach: String(data.approach ?? ""),
    tier: String(data.tier ?? ""),
    hedge_ratio: Number(data.hedge_ratio ?? 0),
    product_ticker: String(data.product_ticker ?? ""),
    brokerage: String(data.brokerage ?? ""),
    brokerage_other: data.brokerage_other ?? null,
    start_timing: String(data.start_timing ?? ""),
    custom_date: data.custom_date ?? null,
    rebalance_frequency: String(data.rebalance_frequency ?? ""),
  });
  return Response.json(plan, { status: 201 });
}
