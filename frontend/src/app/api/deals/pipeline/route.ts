import { dealStore, companyStore } from "@/lib/store";

export async function GET() {
  const allDeals = dealStore.list();
  const stages: Record<string, unknown[]> = {};

  for (const deal of allDeals) {
    if (!stages[deal.status]) stages[deal.status] = [];
    const company = companyStore.get(deal.company_id);
    stages[deal.status].push({
      id: deal.id,
      company_id: deal.company_id,
      company_name: company?.name || "Unknown",
      fee_structure: deal.fee_structure,
      fee_amount: deal.fee_amount,
      annual_fee_revenue: deal.annual_fee_revenue,
      status: deal.status,
      created_at: deal.created_at,
    });
  }

  return Response.json({ stages });
}
