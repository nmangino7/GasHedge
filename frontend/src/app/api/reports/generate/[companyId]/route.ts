import { companyStore } from "@/lib/store";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const company = companyStore.get(Number(companyId));
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  // PDF generation is not supported in serverless — return a placeholder
  return Response.json({
    filename: "report-unavailable.pdf",
    download_url: "#",
    message:
      "PDF report generation is not available in the serverless deployment. Please use the local backend for full report generation.",
  });
}
