export const maxDuration = 60;

import { NextRequest } from "next/server";
import { analyzeCompany, CompanyNotFoundError } from "@/services/company-analysis";
import { buildDeck } from "@/reports/pptx-deck";
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
    const buf = await buildDeck(analysis, {
      firmName,
      advisorName,
      tagline: "Fuel-cost risk management",
    });
    const safeName = analysis.company.name.replace(/[^a-z0-9]+/gi, "_");
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeName}_Fuel_Hedging_Plan.pptx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof CompanyNotFoundError) return fail("NOT_FOUND", e.message);
    console.error("[reports/deck] error:", e);
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to generate deck.");
  }
}
