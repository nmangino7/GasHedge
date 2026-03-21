import { companyStore, INDUSTRY_PROFILES } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const company = companyStore.get(Number(id));
  if (!company)
    return Response.json({ detail: "Company not found" }, { status: 404 });

  const profile = INDUSTRY_PROFILES[company.company_type];
  if (!profile)
    return Response.json(
      { detail: `No benchmark data for type: ${company.company_type}` },
      { status: 400 }
    );

  const monthlyGallons =
    (company.monthly_gallons_gasoline || 0) +
    (company.monthly_gallons_diesel || 0);
  const perUnit =
    company.fleet_size > 0 ? monthlyGallons / company.fleet_size : 0;

  const avgPerUnit = profile.gallons_per_unit_per_month.mid;
  const lowPerUnit = profile.gallons_per_unit_per_month.low;
  const highPerUnit = profile.gallons_per_unit_per_month.high;

  let comparison: string;
  if (perUnit < lowPerUnit * 0.8) comparison = "below_average";
  else if (perUnit > highPerUnit * 1.2) comparison = "above_average";
  else comparison = "average";

  let companyFuelPct: number | null = null;
  if (company.annual_revenue && company.annual_revenue > 0) {
    const annualFuel = monthlyGallons * 3.5 * 12;
    companyFuelPct =
      Math.round((annualFuel / company.annual_revenue) * 100 * 100) / 100;
  }

  return Response.json({
    company_id: company.id,
    company_type: company.company_type,
    company_monthly_gallons: monthlyGallons,
    industry_avg_monthly_gallons: avgPerUnit * company.fleet_size,
    industry_range: {
      low: lowPerUnit * company.fleet_size,
      mid: avgPerUnit * company.fleet_size,
      high: highPerUnit * company.fleet_size,
    },
    company_fuel_pct_revenue: companyFuelPct,
    industry_avg_fuel_pct_revenue: profile.fuel_pct_revenue.mid * 100,
    comparison,
  });
}
