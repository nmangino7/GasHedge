export const maxDuration = 30;
import { companyStore, dealStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import {
  calculateHedgePosition,
  detailedScenarioAnalysis,
  recommendStrategy,
  CORRELATION,
} from "@/lib/hedging-engine";
import { getETFPrice, getAllETFPrices } from "@/lib/alpha-vantage";
import { FEE_STRUCTURES } from "@/lib/constants";

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPrice(n: number): string {
  return n.toFixed(3);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

const APPROACH_PLAIN = {
  etf: "Buying shares of a fund that goes up when fuel prices go up. Hold the shares while fuel costs are high; sell when prices ease. Simplest. No special license. Annual ~1% expense ratio. Series 65/66.",
  options: "Paying a one-time premium up front, like buying insurance. If fuel spikes, the option pays out big. If prices stay flat, the most you lose is the premium. Series 3 license required.",
  futures: "A binding agreement to buy fuel later at today's price. Strongest hedge — moves dollar-for-dollar with wholesale fuel — but margin calls are possible. Series 3 license required.",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company)
      return Response.json({ error: "Company not found" }, { status: 404 });

    const url = new URL(req.url);
    const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");
    const productTicker = url.searchParams.get("product_ticker") || "UGA";

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons =
      fuelType === "diesel"
        ? company.monthly_gallons_diesel || 0
        : company.monthly_gallons_gasoline || 0;

    const [fuelPriceRaw, etfPrice, allEtfPrices, deals] = await Promise.all([
      getCurrentPrice(fuelType, company.padd_region),
      getETFPrice(productTicker),
      getAllETFPrices(),
      dealStore.list(undefined, company.id),
    ]);
    const fuelPrice = fuelPriceRaw || 3.5;

    const position = calculateHedgePosition(
      monthlyGallons,
      fuelType,
      productTicker,
      hedgeRatio,
      fuelPrice,
      etfPrice
    );
    const detailed = detailedScenarioAnalysis(monthlyGallons, position, fuelPrice);
    const strategies = recommendStrategy(fuelType, monthlyGallons, fuelPrice, allEtfPrices);
    const annualCost = monthlyGallons * 12 * fuelPrice;

    const totalAnnualAdvisorRevenue = deals
      .filter((d) => ["signed", "active", "proposed"].includes(d.status))
      .reduce((sum, d) => sum + d.annual_fee_revenue, 0);

    const dealRows = deals
      .map((d) => {
        const label =
          FEE_STRUCTURES.find((f) => f.value === d.fee_structure)?.label ||
          d.fee_structure;
        return `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">#${d.id}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${
            d.fee_structure === "aum_percentage"
              ? `${d.fee_amount}% of $${formatMoney(d.aum_value || 0)}`
              : d.fee_structure === "subscription"
              ? `$${formatMoney(d.fee_amount)}/mo`
              : `$${formatMoney(d.fee_amount)} flat`
          }</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize">${
            d.status
          }</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#047857">$${formatMoney(d.annual_fee_revenue)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(d.annual_fee_revenue * 3)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(d.annual_fee_revenue * 5)}</td>
        </tr>`;
      })
      .join("");

    const scenarioRows = detailed.scenarios
      .map(
        (s) => `
      <tr style="${s.savings >= 0 ? "" : "color:#dc2626"}">
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${
          s.price_change_pct >= 0 ? "+" : ""
        }${(s.price_change_pct * 100).toFixed(0)}%</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">$${formatPrice(
          s.new_price_per_gallon
        )}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(
          s.unhedged_annual_cost
        )}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(
          s.hedged_annual_cost
        )}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${
          s.savings >= 0 ? "#16a34a" : "#dc2626"
        }">${s.savings >= 0 ? "+" : ""}$${formatMoney(s.savings)}</td>
      </tr>`
      )
      .join("");

    const monthlyRows = detailed.monthly_projections
      .map(
        (m) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${m.month}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(
          m.unhedged_cost
        )}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(
          m.hedged_cost
        )}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${
          m.savings >= 0 ? "+" : ""
        }$${formatMoney(m.savings)}</td>
      </tr>`
      )
      .join("");

    const strategyRows = strategies
      .map(
        (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;text-transform:capitalize">${s.tier}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${(s.hedge_ratio * 100).toFixed(0)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${s.product_ticker}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${s.position.shares_needed}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(s.position.dollar_notional)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(s.position.annual_expense_cost)}/yr</td>
      </tr>`
      )
      .join("");

    const recommendedTier =
      strategies.find((s) => Math.abs(s.hedge_ratio - hedgeRatio) < 0.01) ||
      strategies[1];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fuel Hedging Report — ${escapeHtml(company.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; max-width: 900px; margin: 0 auto; padding: 40px 24px; font-size: 14px; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; color: #111827; margin-top: 36px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #4f46e5; }
    h3 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #f9fafb; padding: 8px 12px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .highlight-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .warning-box { background: #fefce8; border: 2px solid #ca8a04; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .bottom-line { background: #eef2ff; border: 2px solid #4f46e5; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .compensation-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .metric { display: inline-block; background: #f3f4f6; border-radius: 8px; padding: 16px 20px; margin: 4px 8px 4px 0; min-width: 160px; }
    .metric-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 22px; font-weight: 700; color: #111827; }
    .step { background: #f9fafb; border-left: 4px solid #4f46e5; padding: 16px 20px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .step-number { display: inline-block; background: #4f46e5; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 8px; }
    .disclaimer { font-size: 11px; color: #6b7280; margin-top: 4px; }
    @media print { body { padding: 20px; } .highlight-box, .warning-box, .step, .bottom-line, .compensation-box { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>Fuel Hedging Analysis Report</h1>
  <p style="color:#6b7280;margin-top:0">Prepared for <strong>${escapeHtml(company.name)}</strong> — ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

  <h2>1. Executive summary &mdash; the bottom line</h2>
  <div class="bottom-line">
    <p style="margin:0;font-size:15px"><strong>Recommendation:</strong> A <strong>${(hedgeRatio * 100).toFixed(0)}% hedge using ${productTicker}</strong>${recommendedTier ? ` (${recommendedTier.tier} tier)` : ""}. Buy <strong>${position.shares_needed} shares</strong> for <strong>$${formatMoney(position.dollar_notional)}</strong>. Annual hedge cost: <strong>$${formatMoney(position.annual_expense_cost)}</strong>. Hedge starts saving money when ${fuelType} rises above <strong>$${formatPrice(detailed.breakeven.fuel_price_per_gallon)}/gal</strong>.</p>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:4px">
    <div class="metric"><div class="metric-label">Fuel Type</div><div class="metric-value" style="font-size:18px;text-transform:capitalize">${fuelType}</div></div>
    <div class="metric"><div class="metric-label">Monthly Gallons</div><div class="metric-value">${formatMoney(monthlyGallons)}</div></div>
    <div class="metric"><div class="metric-label">Current Price</div><div class="metric-value">$${formatPrice(fuelPrice)}/gal</div></div>
    <div class="metric"><div class="metric-label">Annual Fuel Cost</div><div class="metric-value">$${formatMoney(annualCost)}</div></div>
    <div class="metric"><div class="metric-label">Fleet Size</div><div class="metric-value">${company.fleet_size} vehicles</div></div>
    ${company.annual_revenue ? `<div class="metric"><div class="metric-label">Fuel % of Revenue</div><div class="metric-value">${((annualCost / company.annual_revenue) * 100).toFixed(1)}%</div></div>` : ""}
  </div>

  <h2>2. How each strategy works (no jargon)</h2>
  <p style="color:#6b7280;font-size:13px">There are 3 ways to hedge fuel. Here&rsquo;s each one in everyday English so anyone can understand the trade-offs.</p>
  <table>
    <thead>
      <tr>
        <th>Approach</th>
        <th>Plain-English explanation</th>
        <th>License</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">ETF</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${escapeHtml(APPROACH_PLAIN.etf)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">Series 65/66</td></tr>
      <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Options</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${escapeHtml(APPROACH_PLAIN.options)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">Series 3</td></tr>
      <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Futures</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${escapeHtml(APPROACH_PLAIN.futures)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">Series 3</td></tr>
    </tbody>
  </table>

  <h2>3. When does hedging start saving you money?</h2>
  <div class="highlight-box">
    <p style="font-size:18px;font-weight:700;margin:0 0 8px 0">Hedging saves money when ${fuelType} exceeds $${formatPrice(detailed.breakeven.fuel_price_per_gallon)}/gallon</p>
    <p style="margin:0;color:#166534">${escapeHtml(detailed.breakeven.description)}</p>
    <p style="margin:8px 0 0;font-size:13px;color:#166534">At the selected ${(hedgeRatio * 100).toFixed(0)}% hedge ratio using ${productTicker}, the hedge costs $${formatMoney(position.annual_expense_cost)}/year. Prices need to rise more than ${(detailed.breakeven.price_change_pct * 100).toFixed(1)}% above today&rsquo;s level for the hedge to produce net savings.</p>
  </div>

  <h2>4. ETF strategy comparison (conservative / moderate / aggressive)</h2>
  <p style="color:#6b7280;font-size:13px">If you go the ETF route, here are the three coverage levels with exact share counts and capital requirements.</p>
  <table>
    <thead><tr><th>Strategy</th><th>Hedge %</th><th>ETF</th><th style="text-align:right">Shares</th><th style="text-align:right">Investment</th><th style="text-align:right">Annual Cost</th></tr></thead>
    <tbody>${strategyRows}</tbody>
  </table>

  <h2>5. Advisor compensation (transparency)</h2>
  <p style="color:#6b7280;font-size:13px">Every dollar of advisor compensation tied to this client, disclosed in writing per the fiduciary standard.</p>
  ${
    deals.length > 0
      ? `<table>
    <thead>
      <tr>
        <th>Deal</th>
        <th>Fee Structure</th>
        <th>Fee</th>
        <th>Status</th>
        <th style="text-align:right">Annual Revenue</th>
        <th style="text-align:right">3-Year</th>
        <th style="text-align:right">5-Year</th>
      </tr>
    </thead>
    <tbody>${dealRows}</tbody>
  </table>
  <div class="compensation-box">
    <p style="margin:0;font-size:14px"><strong>Total annual advisor revenue from this client: $${formatMoney(totalAnnualAdvisorRevenue)}</strong></p>
    <p style="margin:8px 0 0;font-size:13px;color:#166534">Projected 3-year value: $${formatMoney(totalAnnualAdvisorRevenue * 3)} &middot; 5-year value: $${formatMoney(totalAnnualAdvisorRevenue * 5)}</p>
  </div>`
      : `<div class="warning-box">
    <p style="margin:0;font-size:13px"><strong>No deals on file for this client.</strong> The advisor has not yet established a fee arrangement. Once a deal is created in the GasHedge deals page, it will appear here automatically with full compensation transparency.</p>
  </div>`
  }

  <h2>6. What happens at different fuel prices?</h2>
  <p style="color:#6b7280;font-size:13px">Hedged vs unhedged costs across 19 price scenarios at the ${(hedgeRatio * 100).toFixed(0)}% coverage level.</p>
  <table>
    <thead><tr><th>Price Change</th><th>$/Gallon</th><th style="text-align:right">Unhedged Cost</th><th style="text-align:right">Hedged Cost</th><th style="text-align:right">Savings</th></tr></thead>
    <tbody>${scenarioRows}</tbody>
  </table>

  <h2>7. Month-by-month costs</h2>
  <p style="color:#6b7280;font-size:13px">Projected monthly costs at today&rsquo;s prices with ${(hedgeRatio * 100).toFixed(0)}% coverage.</p>
  <table>
    <thead><tr><th>Month</th><th style="text-align:right">Unhedged</th><th style="text-align:right">Hedged</th><th style="text-align:right">Difference</th></tr></thead>
    <tbody>${monthlyRows}
      <tr style="font-weight:700;background:#f9fafb">
        <td style="padding:8px 12px">Annual Total</td>
        <td style="padding:8px 12px;text-align:right">$${formatMoney(detailed.annual_summary.current_annual_cost)}</td>
        <td style="padding:8px 12px;text-align:right">$${formatMoney(detailed.annual_summary.current_annual_cost + detailed.annual_summary.hedge_annual_expense)}</td>
        <td style="padding:8px 12px;text-align:right;color:#dc2626">-$${formatMoney(detailed.annual_summary.hedge_annual_expense)}</td>
      </tr>
    </tbody>
  </table>
  <div class="warning-box">
    <p style="margin:0;font-weight:600">Why does the &ldquo;hedged&rdquo; column cost more at today&rsquo;s prices?</p>
    <p style="margin:4px 0 0;font-size:13px">Think of the hedge as insurance. At today&rsquo;s prices, the insurance has a cost (the $${formatMoney(position.annual_expense_cost)}/year ETF expense). The hedge starts to <em>pay off</em> only when fuel prices rise above the breakeven shown in section 3. You pay a small premium today for protection against big price spikes tomorrow.</p>
  </div>

  <h2>8. How to actually do this (step by step)</h2>

  <div class="step">
    <p style="margin:0"><span class="step-number">1</span><strong>Open a brokerage account</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Open a standard taxable brokerage account at Schwab, Fidelity, or Interactive Brokers. (Not an IRA.) Use the company&rsquo;s name and EIN. Process takes 1&ndash;3 business days.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">2</span><strong>Fund the account</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Transfer <strong>$${formatMoney(position.dollar_notional)}</strong> &mdash; the capital needed to buy ${position.shares_needed} shares of ${productTicker} at ~$${position.etf_price.toFixed(2)}/share. ACH takes 2&ndash;3 days; wires are same-day.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">3</span><strong>Place the trade</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Buy <strong>${position.shares_needed} shares of ${productTicker}</strong> (${position.product_name}). Use a <strong>limit order</strong> set near the current market price. Place during market hours (9:30 AM&ndash;4:00 PM ET). The ETF correlates ~${(((CORRELATION[fuelType] || {})[productTicker] || 0.8) * 100).toFixed(0)}% with retail ${fuelType}.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">4</span><strong>Set up monitoring</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Track weekly: (1) the position&rsquo;s value vs. fuel costs, (2) ${fuelType} price trends from EIA.gov, (3) the correlation. If correlation drops below 0.7, consider switching ETFs. Set price alerts on the broker for ±10% moves.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">5</span><strong>Quarterly rebalancing</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Each quarter, recalculate: (monthly gallons × current fuel price × 12 × ${(hedgeRatio * 100).toFixed(0)}%) ÷ current ETF price = new target shares. If actual position differs by more than 10%, buy or sell to match.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">6</span><strong>Cost breakdown</strong></p>
    <p style="margin:8px 0 0;font-size:13px">
      ETF expense ratio: ${((position.annual_expense_cost / position.dollar_notional) * 100).toFixed(2)}% = <strong>$${formatMoney(position.annual_expense_cost)}/year</strong><br>
      Trading commissions: $0 at most major brokers<br>
      Advisor fee: <strong>$${formatMoney(totalAnnualAdvisorRevenue)}/year</strong> (see section 5 for full breakdown)<br>
      <strong>Total all-in cost: $${formatMoney(position.annual_expense_cost + totalAnnualAdvisorRevenue)}/year</strong>
    </p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">7</span><strong>Exit strategy</strong></p>
    <p style="margin:8px 0 0;font-size:13px">To unwind, sell all ${position.shares_needed} shares during market hours using a limit order. Settlement is T+1 (cash next business day). <strong>Tax note:</strong> ${productTicker} issues a K-1 form. Gains are taxed at a blended 60% long-term / 40% short-term rate. Consult a tax professional.</p>
  </div>

  <h3>Recommended Timeline</h3>
  <table>
    <thead><tr><th>Week</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 1</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Open brokerage account, initiate funding</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 2</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Account funded, place initial ETF purchase order</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 3</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Confirm position, set up price alerts and monitoring</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Monthly</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Brief check-in: hedge value vs. fuel costs</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Quarterly</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Rebalance position if drift exceeds 10%</td></tr>
      <tr><td style="padding:6px 12px;font-weight:600">Annually</td><td style="padding:6px 12px">Full strategy review, file K-1 with taxes</td></tr>
    </tbody>
  </table>

  <h2>9. Disclosures</h2>
  <p class="disclaimer">This analysis is provided for informational purposes under an advisory relationship. Securities recommended are limited to registered investment products (ETFs, mutual funds). Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses, tracking error, and may not perfectly correlate with retail fuel prices.</p>
  <p class="disclaimer">Commodity ETFs structured as limited partnerships issue Schedule K-1 tax forms. Gains are taxed at a blended 60/40 long-term/short-term rate. Hedging strategies should be evaluated based on each company&rsquo;s specific financial situation and risk tolerance. HYPOTHETICAL PERFORMANCE RESULTS have many inherent limitations.</p>
  <p class="disclaimer" style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb">Generated by GasHedge &mdash; ${new Date().toISOString()}</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="hedging-report-${company.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.html"`,
      },
    });
  } catch (e) {
    console.error("[Report Generate] Error:", e);
    return Response.json(
      {
        error: "Failed to generate report",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
