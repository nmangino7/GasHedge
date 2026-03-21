import { dealStore, companyStore } from "@/lib/store";
import { calculateDealRevenue } from "@/lib/hedging-engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deal = dealStore.get(Number(id));
  if (!deal)
    return Response.json({ detail: "Deal not found" }, { status: 404 });
  const company = companyStore.get(deal.company_id);
  return Response.json({
    ...deal,
    company_name: company?.name || "Unknown",
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deal = dealStore.get(Number(id));
  if (!deal)
    return Response.json({ detail: "Deal not found" }, { status: 404 });

  const data = await req.json();

  if (
    data.fee_structure !== undefined ||
    data.fee_amount !== undefined ||
    data.aum_value !== undefined
  ) {
    data.annual_fee_revenue = calculateDealRevenue(
      data.fee_structure ?? deal.fee_structure,
      data.fee_amount ?? deal.fee_amount,
      data.aum_value ?? deal.aum_value
    );
  }

  const updated = dealStore.update(Number(id), data);
  if (!updated)
    return Response.json({ detail: "Deal not found" }, { status: 404 });

  const company = companyStore.get(updated.company_id);
  return Response.json({
    ...updated,
    company_name: company?.name || "Unknown",
  });
}
