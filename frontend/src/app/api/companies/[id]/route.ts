import { companyStore } from "@/lib/store";

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
  const data = await req.json();
  const company = await companyStore.update(Number(id), data);
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
