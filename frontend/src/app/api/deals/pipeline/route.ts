import { dealStore, companyStore } from "@/lib/store";

export async function GET() {
  const allDeals = await dealStore.list();
  const stages: Record<string, unknown[]> = {};

  const companyIds = Array.from(new Set(allDeals.map((d) => d.company_id)));
  const companies = await Promise.all(
    companyIds.map((id) => companyStore.get(id))
  );
  const nameById = new Map(
    companies.filter(Boolean).map((c) => [c!.id, c!.name])
  );

  for (const deal of allDeals) {
    if (!stages[deal.status]) stages[deal.status] = [];
    stages[deal.status].push({
      id: deal.id,
      company_id: deal.company_id,
      company_name: nameById.get(deal.company_id) || "Unknown",
      fee_structure: deal.fee_structure,
      fee_amount: deal.fee_amount,
      annual_fee_revenue: deal.annual_fee_revenue,
      status: deal.status,
      created_at: deal.created_at,
    });
  }

  return Response.json({ stages });
}
