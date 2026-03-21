export const maxDuration = 30;
import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = companyStore.get(Number(companyId));
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    const url = new URL(req.url);
    const annualBudget = parseFloat(url.searchParams.get("budget") || "0");
    const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons = fuelType === "diesel"
      ? (company.monthly_gallons_diesel || 0)
      : (company.monthly_gallons_gasoline || 0);

    const currentPrice = (await getCurrentPrice(fuelType, company.padd_region)) || 3.50;
    const monthlyBaseCost = monthlyGallons * currentPrice;
    const annualBaseCost = monthlyBaseCost * 12;
    const budget = annualBudget > 0 ? annualBudget : annualBaseCost * 1.1; // Default: 110% of current

    // Monthly burn-down at current prices
    const burnDown = [];
    let remaining = budget;
    for (let m = 1; m <= 12; m++) {
      remaining -= monthlyBaseCost;
      burnDown.push({
        month: m,
        label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1],
        spent: Math.round(monthlyBaseCost * m * 100) / 100,
        remaining: Math.round(Math.max(0, remaining) * 100) / 100,
        on_track: remaining >= 0,
      });
    }

    // Scenario analysis at different price changes
    const scenarios = [-0.1, 0, 0.1, 0.2, 0.3, 0.5].map((change) => {
      const newPrice = currentPrice * (1 + change);
      const newMonthly = monthlyGallons * newPrice;
      const newAnnual = newMonthly * 12;
      const overBudget = newAnnual - budget;
      const monthsUntilExhausted = newMonthly > 0 ? Math.floor(budget / newMonthly) : 12;

      // With hedge savings
      const hedgeSavings = change > 0 ? (newAnnual - annualBaseCost) * hedgeRatio * 0.85 : 0; // 85% effective due to correlation
      const hedgedAnnual = newAnnual - hedgeSavings;
      const hedgedOverBudget = hedgedAnnual - budget;

      return {
        price_change_pct: change,
        new_price: Math.round(newPrice * 1000) / 1000,
        annual_cost: Math.round(newAnnual),
        over_budget: Math.round(overBudget),
        months_until_exhausted: Math.min(12, monthsUntilExhausted),
        hedged_annual_cost: Math.round(hedgedAnnual),
        hedged_over_budget: Math.round(hedgedOverBudget),
        hedge_savings: Math.round(hedgeSavings),
      };
    });

    const budgetUtilization = Math.round((annualBaseCost / budget) * 100);
    const budgetStatus = budgetUtilization > 100 ? "over" : budgetUtilization > 90 ? "warning" : "healthy";

    return Response.json({
      company_id: Number(companyId),
      company_name: company.name,
      fuel_type: fuelType,
      monthly_gallons: monthlyGallons,
      current_price: currentPrice,
      annual_budget: Math.round(budget),
      annual_base_cost: Math.round(annualBaseCost),
      monthly_base_cost: Math.round(monthlyBaseCost),
      budget_utilization_pct: budgetUtilization,
      budget_status: budgetStatus,
      burn_down: burnDown,
      scenarios,
      hedge_ratio: hedgeRatio,
    });
  } catch (e) {
    console.error("[Budget] Error:", e);
    return Response.json({ error: "Failed to calculate budget", details: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
