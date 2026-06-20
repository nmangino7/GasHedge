import { dealStore, companyStore } from "@/lib/store";
import { calculateDealRevenue } from "@/lib/hedging-engine";
import { parseJson } from "@/api/validate";
import { DealUpdateSchema } from "@/api/schemas/deal";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deal = await dealStore.get(Number(id));
  if (!deal)
    return Response.json({ detail: "Deal not found" }, { status: 404 });
  const company = await companyStore.get(deal.company_id);
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
  const deal = await dealStore.get(Number(id));
  if (!deal)
    return Response.json({ detail: "Deal not found" }, { status: 404 });

  const parsed = await parseJson(req, DealUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const data: Record<string, unknown> = { ...parsed.data };

  if (
    data.fee_structure !== undefined ||
    data.fee_amount !== undefined ||
    data.aum_value !== undefined
  ) {
    data.annual_fee_revenue = calculateDealRevenue(
      (data.fee_structure as string) ?? deal.fee_structure,
      (data.fee_amount as number) ?? deal.fee_amount,
      (data.aum_value as number | null) ?? deal.aum_value
    );
  }

  const updated = await dealStore.update(Number(id), data);
  if (!updated)
    return Response.json({ detail: "Deal not found" }, { status: 404 });

  const company = await companyStore.get(updated.company_id);
  return Response.json({
    ...updated,
    company_name: company?.name || "Unknown",
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await dealStore.delete(Number(id));
  if (!deleted)
    return Response.json({ detail: "Deal not found" }, { status: 404 });
  return Response.json({ status: "deleted" });
}
