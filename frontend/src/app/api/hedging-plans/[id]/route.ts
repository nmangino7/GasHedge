import { hedgingPlanStore, companyStore } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await hedgingPlanStore.get(Number(id));
  if (!plan) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }
  const company = await companyStore.get(plan.company_id);
  return Response.json({
    ...plan,
    company_name: company?.name || "Unknown",
    company,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await hedgingPlanStore.delete(Number(id));
  if (!ok) {
    return Response.json({ error: "Plan not found" }, { status: 404 });
  }
  return Response.json({ status: "deleted" });
}
