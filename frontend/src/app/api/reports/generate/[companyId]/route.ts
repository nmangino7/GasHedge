export const maxDuration = 30;
import { companyStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import {
  calculateHedgePosition,
  detailedScenarioAnalysis,
  recommendStrategy,
  CORRELATION,
} from "@/lib/hedging-engine";
import { getETFPrice, getAllETFPrices } from "@/lib/alpha-vantage";

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPrice(n: number): string {
  return n.toFixed(3);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = companyStore.get(Number(companyId));
    if (!company)
      return Response.json({ error: "Company not found" }, { status: 404 });

    const url = new URL(req.url);
    const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");
    const productTicker = url.searchParams.get("product_ticker") || "UGA";

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons = fuelType === "diesel"
      ? (company.monthly_gallons_diesel || 0)
      : (company.monthly_gallons_gasoline || 0);

    const [fuelPriceRaw, etfPrice, allEtfPrices] = await Promise.all([
      getCurrentPrice(fuelType, company.padd_region),
      getETFPrice(productTicker),
      getAllETFPrices(),
    ]);
    const fuelPrice = fuelPriceRaw || 3.5;

    const position = calculateHedgePosition(monthlyGallons, fuelType, productTicker, hedgeRatio, fuelPrice, etfPrice);
    const detailed = detailedScenarioAnalysis(monthlyGallons, position, fuelPrice);
    const strategies = recommendStrategy(fuelType, monthlyGallons, fuelPrice, allEtfPrices);
    const annualCost = monthlyGallons * 12 * fuelPrice;

    const scenarioRows = detailed.scenarios.map(s => `
      <tr style="${s.savings >= 0 ? '' : 'color:#dc2626'}">
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${s.price_change_pct >= 0 ? '+' : ''}${(s.price_change_pct * 100).toFixed(0)}%</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">$${formatPrice(s.new_price_per_gallon)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(s.unhedged_annual_cost)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(s.hedged_annual_cost)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${s.savings >= 0 ? '#16a34a' : '#dc2626'}">${s.savings >= 0 ? '+' : ''}$${formatMoney(s.savings)}</td>
      </tr>`).join("");

    const monthlyRows = detailed.monthly_projections.map(m => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${m.month}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(m.unhedged_cost)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(m.hedged_cost)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${m.savings >= 0 ? '+' : ''}$${formatMoney(m.savings)}</td>
      </tr>`).join("");

    const strategyRows = strategies.map(s => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;text-transform:capitalize">${s.tier}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${(s.hedge_ratio * 100).toFixed(0)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${s.product_ticker}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${s.position.shares_needed}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(s.position.dollar_notional)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${formatMoney(s.position.annual_expense_cost)}/yr</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fuel Hedging Report — ${company.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; max-width: 900px; margin: 0 auto; padding: 40px 24px; font-size: 14px; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; color: #111827; margin-top: 36px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #111827; }
    h3 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #f9fafb; padding: 8px 12px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .highlight-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .warning-box { background: #fefce8; border: 2px solid #ca8a04; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .metric { display: inline-block; background: #f3f4f6; border-radius: 8px; padding: 16px 20px; margin: 4px 8px 4px 0; min-width: 160px; }
    .metric-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 22px; font-weight: 700; color: #111827; }
    .step { background: #f9fafb; border-left: 4px solid #111827; padding: 16px 20px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .step-number { display: inline-block; background: #111827; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 8px; }
    .disclaimer { font-size: 11px; color: #6b7280; margin-top: 4px; }
    @media print { body { padding: 20px; } .highlight-box, .warning-box, .step { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>Fuel Hedging Analysis Report</h1>
  <p style="color:#6b7280;margin-top:0">Prepared for <strong>${company.name}</strong> — ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

  <h2>1. Executive Summary</h2>
  <div style="display:flex;flex-wrap:wrap;gap:4px">
    <div class="metric"><div class="metric-label">Fuel Type</div><div class="metric-value" style="font-size:18px;text-transform:capitalize">${fuelType}</div></div>
    <div class="metric"><div class="metric-label">Monthly Gallons</div><div class="metric-value">${formatMoney(monthlyGallons)}</div></div>
    <div class="metric"><div class="metric-label">Current Price</div><div class="metric-value">$${formatPrice(fuelPrice)}/gal</div></div>
    <div class="metric"><div class="metric-label">Annual Fuel Cost</div><div class="metric-value">$${formatMoney(annualCost)}</div></div>
    <div class="metric"><div class="metric-label">Fleet Size</div><div class="metric-value">${company.fleet_size} vehicles</div></div>
    ${company.annual_revenue ? `<div class="metric"><div class="metric-label">Fuel % of Revenue</div><div class="metric-value">${((annualCost / company.annual_revenue) * 100).toFixed(1)}%</div></div>` : ""}
  </div>

  <h2>2. Breakeven Analysis</h2>
  <div class="highlight-box">
    <p style="font-size:18px;font-weight:700;margin:0 0 8px 0">Hedging saves money when ${fuelType} exceeds $${formatPrice(detailed.breakeven.fuel_price_per_gallon)}/gallon</p>
    <p style="margin:0;color:#166534">${detailed.breakeven.description}</p>
    <p style="margin:8px 0 0;font-size:13px;color:#166534">At the selected ${(hedgeRatio * 100).toFixed(0)}% hedge ratio using ${productTicker}, your hedge cost is $${formatMoney(position.annual_expense_cost)}/year. Prices must rise >${(detailed.breakeven.price_change_pct * 100).toFixed(1)}% for the hedge to generate net savings.</p>
  </div>

  <h2>3. Strategy Comparison</h2>
  <table>
    <thead><tr><th>Strategy</th><th>Hedge %</th><th>ETF</th><th style="text-align:right">Shares</th><th style="text-align:right">Investment</th><th style="text-align:right">Annual Cost</th></tr></thead>
    <tbody>${strategyRows}</tbody>
  </table>

  <h2>4. Price Sensitivity Analysis</h2>
  <p style="color:#6b7280">Shows hedged vs unhedged costs across 19 price scenarios at ${(hedgeRatio * 100).toFixed(0)}% hedge ratio.</p>
  <table>
    <thead><tr><th>Price Change</th><th>$/Gallon</th><th style="text-align:right">Unhedged Cost</th><th style="text-align:right">Hedged Cost</th><th style="text-align:right">Savings</th></tr></thead>
    <tbody>${scenarioRows}</tbody>
  </table>

  <h2>5. Monthly Cost Projections</h2>
  <p style="color:#6b7280">Projected monthly costs at current price levels with ${(hedgeRatio * 100).toFixed(0)}% hedge.</p>
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
    <p style="margin:0;font-weight:600">Note on Monthly Projections</p>
    <p style="margin:4px 0 0;font-size:13px">At current prices, the hedge has a net cost of $${formatMoney(position.annual_expense_cost)}/year (ETF expense ratio). The hedge pays off when prices rise — see the breakeven analysis above. This is insurance: you pay a small premium for protection against large price spikes.</p>
  </div>

  <h2>6. Implementation Guide</h2>

  <div class="step">
    <p style="margin:0"><span class="step-number">1</span><strong>Open a Brokerage Account</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Open a standard brokerage account at Schwab, Fidelity, or Interactive Brokers. You need a regular taxable account (not an IRA). Choose a broker with low/no commissions on ETF trades. Process takes 1-3 business days.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">2</span><strong>Fund the Account</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Transfer <strong>$${formatMoney(position.dollar_notional)}</strong> to cover your ${(hedgeRatio * 100).toFixed(0)}% hedge position. This is the capital needed to purchase ${position.shares_needed} shares of ${productTicker} at ~$${position.etf_price.toFixed(2)}/share. Fund via ACH (2-3 days) or wire (same day).</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">3</span><strong>Place the Trade</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Buy <strong>${position.shares_needed} shares of ${productTicker}</strong> (${position.product_name}). Use a <strong>limit order</strong> set near the current market price to control execution cost. Place during market hours (9:30 AM - 4:00 PM ET). The ETF has a ${((CORRELATION[fuelType] || {})[productTicker] || 0.8 * 100).toFixed(0)}% correlation to retail ${fuelType} prices.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">4</span><strong>Set Up Monitoring</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Track these weekly: (1) Your ETF position value vs. your fuel costs. (2) ${fuelType} price trends from EIA.gov. (3) ETF vs fuel price correlation — if it drops below 0.7, consider switching ETFs. Set price alerts on your broker platform for ±10% moves.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">5</span><strong>Quarterly Rebalancing</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Every quarter, recalculate your target position: (monthly gallons × current fuel price × 12 × ${(hedgeRatio * 100).toFixed(0)}%) ÷ current ETF price = new shares target. If the difference is >10% from your current holdings, buy or sell shares to rebalance.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">6</span><strong>Cost Breakdown</strong></p>
    <p style="margin:8px 0 0;font-size:13px">
      ETF Expense Ratio: ${((position.annual_expense_cost / position.dollar_notional) * 100).toFixed(2)}% = <strong>$${formatMoney(position.annual_expense_cost)}/year</strong><br>
      Trading Commissions: $0 at most major brokers<br>
      Advisory Fee: Per your advisory agreement (typically 0.5-1.5% of AUM)<br>
      <strong>Total estimated all-in cost: $${formatMoney(position.annual_expense_cost)}/year</strong> (excluding advisory fees)
    </p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">7</span><strong>Exit Strategy</strong></p>
    <p style="margin:8px 0 0;font-size:13px">To unwind: sell all ${position.shares_needed} shares during market hours using a limit order. Settlement is T+1 (cash available next business day). <strong>Tax note:</strong> ${productTicker} issues a K-1 form. Gains are taxed 60% long-term / 40% short-term regardless of holding period. Consult your accountant.</p>
  </div>

  <h3>Recommended Timeline</h3>
  <table>
    <thead><tr><th>Week</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 1</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Open brokerage account, initiate funding</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 2</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Account funded, place initial ETF purchase order</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 3</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Confirm position, set up price alerts and monitoring</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Monthly</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Review fuel costs vs ETF performance</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Quarterly</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Rebalance position if drift exceeds 10%</td></tr>
      <tr><td style="padding:6px 12px;font-weight:600">Annually</td><td style="padding:6px 12px">Full strategy review, file K-1 with taxes</td></tr>
    </tbody>
  </table>

  <h2>7. Disclosures</h2>
  <p class="disclaimer">This analysis is provided for informational purposes under an advisory relationship. Securities recommended are limited to registered investment products (ETFs, mutual funds). Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses, tracking error, and may not perfectly correlate with retail fuel prices.</p>
  <p class="disclaimer">Commodity ETFs structured as limited partnerships issue Schedule K-1 tax forms. Gains are taxed at a blended 60/40 long-term/short-term rate. Hedging strategies should be evaluated based on each company's specific financial situation and risk tolerance. HYPOTHETICAL PERFORMANCE RESULTS have many inherent limitations.</p>
  <p class="disclaimer" style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb">Generated by GasHedge — ${new Date().toISOString()}</p>
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
      { error: "Failed to generate report", details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
