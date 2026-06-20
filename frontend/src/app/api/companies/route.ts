import { companyStore } from "@/lib/store";
import { parseJson } from "@/api/validate";
import { CompanyCreateSchema } from "@/api/schemas/company";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const companyType = url.searchParams.get("company_type") || undefined;
  return Response.json(await companyStore.list(status, companyType));
}

export async function POST(req: Request) {
  const parsed = await parseJson(req, CompanyCreateSchema);
  if (!parsed.ok) return parsed.response;
  const company = await companyStore.create(
    parsed.data as Parameters<typeof companyStore.create>[0]
  );
  return Response.json(company, { status: 201 });
}
