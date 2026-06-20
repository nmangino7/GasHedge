import { companyStore } from "@/lib/store";
import { parseJson } from "@/api/validate";
import { CompanyUpdateSchema } from "@/api/schemas/company";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const company = await companyStore.get(Number(id));
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });
  return Response.json(company);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJson(req, CompanyUpdateSchema);
  if (!parsed.ok) return parsed.response;
  const company = await companyStore.update(
    Number(id),
    parsed.data as Parameters<typeof companyStore.update>[1]
  );
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });
  return Response.json(company);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await companyStore.delete(Number(id));
  if (!deleted)
    return Response.json({ detail: "Company not found" }, { status: 404 });
  return Response.json({ status: "archived" });
}
