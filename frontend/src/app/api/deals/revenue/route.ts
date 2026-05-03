import { dealStore, companyStore } from "@/lib/store";

export async function GET() {
  const activeStatuses = ["signed", "active"];
  const allDeals = await dealStore.list();
  const activeDeals = allDeals.filter((d) =>
    activeStatuses.includes(d.status)
  );

  const totalAnnual = activeDeals.reduce(
    (sum, d) => sum + d.annual_fee_revenue,
    0
  );

  const revenueByType: Record<string, number> = {};
  for (const deal of activeDeals) {
    revenueByType[deal.fee_structure] =
      (revenueByType[deal.fee_structure] || 0) + deal.annual_fee_revenue;
  }

  const pipelineStatuses = ["prospect", "proposed", "signed", "active"];
  const pipelineDeals = allDeals.filter((d) =>
    pipelineStatuses.includes(d.status)
  );
  const pipelineValue = pipelineDeals.reduce(
    (sum, d) => sum + d.annual_fee_revenue,
    0
  );

  const companyIds = Array.from(new Set(activeDeals.map((d) => d.company_id)));
  const companies = await Promise.all(
    companyIds.map((id) => companyStore.get(id))
  );
  const nameById = new Map(
    companies.filter(Boolean).map((c) => [c!.id, c!.name])
  );

  const clientRevenue: Record<
    number,
    {
      company_id: number;
      company_name: string;
      annual_revenue: number;
      deal_count: number;
    }
  > = {};
  for (const deal of activeDeals) {
    if (!clientRevenue[deal.company_id]) {
      clientRevenue[deal.company_id] = {
        company_id: deal.company_id,
        company_name: nameById.get(deal.company_id) || "Unknown",
        annual_revenue: 0,
        deal_count: 0,
      };
    }
    clientRevenue[deal.company_id].annual_revenue += deal.annual_fee_revenue;
    clientRevenue[deal.company_id].deal_count += 1;
  }

  const topClients = Object.values(clientRevenue)
    .sort((a, b) => b.annual_revenue - a.annual_revenue)
    .slice(0, 10);

  return Response.json({
    total_annual_revenue: Math.round(totalAnnual * 100) / 100,
    total_monthly_revenue: Math.round((totalAnnual / 12) * 100) / 100,
    active_deals: activeDeals.length,
    pipeline_value: Math.round(pipelineValue * 100) / 100,
    revenue_by_type: revenueByType,
    top_clients: topClients,
  });
}
