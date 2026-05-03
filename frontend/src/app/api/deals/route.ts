import { dealStore, companyStore } from "@/lib/store";
import { calculateDealRevenue } from "@/lib/hedging-engine";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const companyId = url.searchParams.get("company_id");

  const deals = await dealStore.list(
    status,
    companyId ? Number(companyId) : undefined
  );

  const companyIds = Array.from(new Set(deals.map((d) => d.company_id)));
  const companies = await Promise.all(
    companyIds.map((id) => companyStore.get(id))
  );
  const nameById = new Map(
    companies.filter(Boolean).map((c) => [c!.id, c!.name])
  );

  return Response.json(
    deals.map((d) => ({
      ...d,
      company_name: nameById.get(d.company_id) || "Unknown",
    }))
  );
}

export async function POST(req: Request) {
  const data = await req.json();
  const company = await companyStore.get(data.company_id);
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  const annualRevenue = calculateDealRevenue(
    data.fee_structure,
    data.fee_amount,
    data.aum_value
  );

  const deal = await dealStore.create({
    ...data,
    annual_fee_revenue: annualRevenue,
  });

  return Response.json(
    { ...deal, company_name: company.name },
    { status: 201 }
  );
}
