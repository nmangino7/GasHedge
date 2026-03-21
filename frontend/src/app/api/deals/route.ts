import { dealStore, companyStore } from "@/lib/store";
import { calculateDealRevenue } from "@/lib/hedging-engine";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const companyId = url.searchParams.get("company_id");

  const deals = dealStore.list(
    status,
    companyId ? Number(companyId) : undefined
  );

  return Response.json(
    deals.map((d) => {
      const company = companyStore.get(d.company_id);
      return { ...d, company_name: company?.name || "Unknown" };
    })
  );
}

export async function POST(req: Request) {
  const data = await req.json();
  const company = companyStore.get(data.company_id);
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  const annualRevenue = calculateDealRevenue(
    data.fee_structure,
    data.fee_amount,
    data.aum_value
  );

  const deal = dealStore.create({
    ...data,
    annual_fee_revenue: annualRevenue,
  });

  return Response.json(
    { ...deal, company_name: company.name },
    { status: 201 }
  );
}
