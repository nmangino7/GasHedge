export const maxDuration = 60;

import { NextRequest } from "next/server";
import { analyzeCompany, CompanyNotFoundError } from "@/services/company-analysis";
import { buildHtmlReport } from "@/reports/html-report";
import { fail } from "@/api/envelope";

function clamp(x: number, lo: number, hi: number): number {
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : 0.5;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const url = new URL(req.url);
  const firmName = url.searchParams.get("firm") || "GasHedge Advisory";
  const advisorName = url.searchParams.get("advisor") || undefined;
  const coverage = clamp(parseFloat(url.searchParams.get("coverage") || "0.5"), 0.05, 1);

  try {
    const analysis = await analyzeCompany(Number(companyId), coverage);
    const html = buildHtmlReport(analysis, { firmName, advisorName, tagline: "Fuel-cost risk management" });
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof CompanyNotFoundError) return fail("NOT_FOUND", e.message);
    console.error("[reports/client-plan] error:", e);
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to generate report.");
  }
}
