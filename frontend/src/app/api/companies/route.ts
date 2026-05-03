import { companyStore } from "@/lib/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const companyType = url.searchParams.get("company_type") || undefined;
  return Response.json(await companyStore.list(status, companyType));
}

export async function POST(req: Request) {
  const data = await req.json();
  const company = await companyStore.create(data);
  return Response.json(company, { status: 201 });
}
