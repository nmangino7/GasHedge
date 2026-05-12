export const maxDuration = 30;
import { companyStore, dealStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import {
  calculateHedgePosition,
  detailedScenarioAnalysis,
  recommendStrategy,
  recommendEtfOptionsStrategies,
  CORRELATION,
} from "@/lib/hedging-engine";
import { buildScenarios } from "@/lib/options-scenario";
import { getETFPrice, getAllETFPrices } from "@/lib/alpha-vantage";
import { getMultipleQuotes } from "@/lib/yahoo-options";
import { getEtfMeta } from "@/lib/etf-library";
import { FEE_STRUCTURES } from "@/lib/constants";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtPrice(n: number): string {
  return n.toFixed(3);
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    const url = new URL(req.url);
    const hedgeRatio = parseFloat(url.searchParams.get("hedge_ratio") || "0.5");
    const productTicker = url.searchParams.get("product_ticker") || "UGA";
    const optionStrategyKey = url.searchParams.get("option_strategy") || "collar";

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons =
      fuelType === "diesel"
        ? company.monthly_gallons_diesel || 0
        : company.monthly_gallons_gasoline || 0;

    const [fuelPriceRaw, etfPrice, allEtfPrices, liveQuotes, deals] = await Promise.all([
      getCurrentPrice(fuelType, company.padd_region),
      getETFPrice(productTicker),
      getAllETFPrices(),
      getMultipleQuotes(["UGA", "USO", "BNO", "UNL"]).catch(() => ({})),
      dealStore.list(undefined, company.id),
    ]);
    const fuelPrice = fuelPriceRaw || 3.5;

    const etfPrices: Record<string, number> = { ...allEtfPrices };
    for (const [k, v] of Object.entries(liveQuotes)) {
      if (v?.price && v.price > 0) etfPrices[k] = v.price;
    }
    const liveEtfPrice = etfPrices[productTicker] ?? etfPrice;

    const position = calculateHedgePosition(
      monthlyGallons,
      fuelType,
      productTicker,
      hedgeRatio,
      fuelPrice,
      liveEtfPrice
    );
    const detailed = detailedScenarioAnalysis(monthlyGallons, position, fuelPrice);
    const strategies = recommendStrategy(fuelType, monthlyGallons, fuelPrice, etfPrices);
    const optionsStrategies = recommendEtfOptionsStrategies(
      monthlyGallons,
      fuelType,
      fuelPrice,
      etfPrices,
      hedgeRatio
    );
    const selectedOption =
      optionsStrategies.find((s) => s.strategy_key === optionStrategyKey) ??
      optionsStrategies.find((s) => s.strategy_key === "collar") ??
      optionsStrategies[0];

    const etfMeta = getEtfMeta(productTicker);
    const correlation =
      etfMeta?.correlation_to_retail ??
      (CORRELATION[fuelType] || {})[productTicker] ??
      0.85;

    const optionScenarios = buildScenarios({
      strategy: selectedOption,
      monthlyGallons,
      currentFuelPrice: fuelPrice,
      correlation,
    });

    const annualCost = monthlyGallons * 12 * fuelPrice;

    const totalAnnualAdvisorRevenue = deals
      .filter((d) => ["signed", "active", "proposed"].includes(d.status))
      .reduce((sum, d) => sum + d.annual_fee_revenue, 0);

    const recommendedTier =
      strategies.find((s) => Math.abs(s.hedge_ratio - hedgeRatio) < 0.01) ||
      strategies[1];

    const dealRows = deals
      .map((d) => {
        const label =
          FEE_STRUCTURES.find((f) => f.value === d.fee_structure)?.label ||
          d.fee_structure;
        return `
        <tr>
          <td>#${d.id}</td>
          <td>${escapeHtml(label)}</td>
          <td>${
            d.fee_structure === "aum_percentage"
              ? `${d.fee_amount}% of $${fmtMoney(d.aum_value || 0)}`
              : d.fee_structure === "subscription"
              ? `$${fmtMoney(d.fee_amount)}/mo`
              : `$${fmtMoney(d.fee_amount)} flat`
          }</td>
          <td class="cap">${d.status}</td>
          <td class="right pos">$${fmtMoney(d.annual_fee_revenue)}</td>
          <td class="right">$${fmtMoney(d.annual_fee_revenue * 3)}</td>
          <td class="right">$${fmtMoney(d.annual_fee_revenue * 5)}</td>
        </tr>`;
      })
      .join("");

    const scenarioRows = detailed.scenarios
      .map(
        (s) => `
      <tr>
        <td><strong>${s.price_change_pct >= 0 ? "+" : ""}${(s.price_change_pct * 100).toFixed(0)}%</strong></td>
        <td>$${fmtPrice(s.new_price_per_gallon)}</td>
        <td class="right">$${fmtMoney(s.unhedged_annual_cost)}</td>
        <td class="right">$${fmtMoney(s.hedged_annual_cost)}</td>
        <td class="right ${s.savings >= 0 ? "pos" : "neg"}">${s.savings >= 0 ? "+" : ""}$${fmtMoney(s.savings)}</td>
      </tr>`
      )
      .join("");

    const optionScenarioRows = optionScenarios.scenarios
      .map((s) => {
        const isSpot = Math.abs(s.etf_price - optionScenarios.spot_etf_price) < 0.5;
        return `
      <tr ${isSpot ? 'class="spot-row"' : ""}>
        <td><strong>$${s.etf_price.toFixed(2)}</strong>${isSpot ? " · spot" : ""}</td>
        <td class="${s.fuel_pct_change >= 0 ? "neg" : "pos"}">${s.fuel_pct_change >= 0 ? "+" : ""}${s.fuel_pct_change.toFixed(1)}%</td>
        <td>$${s.implied_fuel_price.toFixed(3)}</td>
        <td class="right">$${fmtMoney(s.unhedged_annual_cost)}</td>
        <td class="right ${s.option_payoff >= 0 ? "pos" : "neg"}">${s.option_payoff >= 0 ? "+" : ""}$${fmtMoney(s.option_payoff)}</td>
        <td class="right">$${fmtMoney(s.hedged_annual_cost)}</td>
        <td class="right ${s.hedge_value >= 0 ? "pos" : "neg"}"><strong>${s.hedge_value >= 0 ? "+" : ""}$${fmtMoney(s.hedge_value)}</strong></td>
      </tr>`;
      })
      .join("");

    const strategyRows = strategies
      .map(
        (s) => `
      <tr ${recommendedTier && s.tier === recommendedTier.tier ? 'class="recommended-row"' : ""}>
        <td class="cap"><strong>${s.tier}</strong>${recommendedTier && s.tier === recommendedTier.tier ? " ← recommended" : ""}</td>
        <td>${(s.hedge_ratio * 100).toFixed(0)}%</td>
        <td>${s.product_ticker}</td>
        <td class="right">${s.position.shares_needed.toLocaleString()}</td>
        <td class="right">$${fmtMoney(s.position.dollar_notional)}</td>
        <td class="right">$${fmtMoney(s.position.annual_expense_cost)}/yr</td>
      </tr>`
      )
      .join("");

    const legRows = selectedOption.legs
      .map(
        (leg) => `
      <tr>
        <td><strong>${leg.side === "long" ? "BUY" : "SELL"}</strong></td>
        <td>${leg.option_type.toUpperCase()}</td>
        <td>$${leg.strike.toFixed(2)}</td>
        <td class="right">${leg.contracts}</td>
        <td class="right">$${leg.premium_per_share.toFixed(2)}/sh</td>
        <td class="right">Δ ${leg.delta.toFixed(2)}</td>
        <td class="right">θ ${leg.theta_per_day.toFixed(3)}/d</td>
      </tr>`
      )
      .join("");

    const chartSvg = (() => {
      const w = 720;
      const h = 220;
      const pad = { top: 12, right: 16, bottom: 28, left: 60 };
      const pts = optionScenarios.scenarios;
      if (pts.length === 0) return "";
      const xMin = pts[0].etf_price;
      const xMax = pts[pts.length - 1].etf_price;
      const allYs = pts.flatMap((p) => [p.unhedged_annual_cost, p.hedged_annual_cost]);
      const yMin = Math.min(...allYs);
      const yMax = Math.max(...allYs);
      const innerW = w - pad.left - pad.right;
      const innerH = h - pad.top - pad.bottom;
      const sx = (x: number) => pad.left + ((x - xMin) / (xMax - xMin)) * innerW;
      const sy = (y: number) => pad.top + innerH - ((y - yMin) / (yMax - yMin)) * innerH;
      const path = (key: "unhedged_annual_cost" | "hedged_annual_cost") =>
        pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.etf_price)},${sy(p[key])}`).join(" ");
      const xLabels = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]];
      return `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;margin:8px 0">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#fff" />
        <text x="${pad.left}" y="12" font-size="10" fill="#6b7280">Annual fuel cost ($)</text>
        <path d="${path("unhedged_annual_cost")}" stroke="#c0392b" stroke-width="2" fill="none" />
        <path d="${path("hedged_annual_cost")}" stroke="#d4762a" stroke-width="2.5" fill="none" />
        <line x1="${sx(optionScenarios.spot_etf_price)}" y1="${pad.top}" x2="${sx(optionScenarios.spot_etf_price)}" y2="${h - pad.bottom}" stroke="#6b7280" stroke-dasharray="4 4" />
        ${xLabels.map((p) => `<text x="${sx(p.etf_price)}" y="${h - 8}" font-size="10" fill="#6b7280" text-anchor="middle">$${p.etf_price.toFixed(0)}</text>`).join("")}
        <text x="${sx(optionScenarios.spot_etf_price)}" y="${pad.top + 14}" font-size="9" fill="#6b7280" text-anchor="middle">Spot</text>
        <text x="${w - pad.right - 4}" y="${pad.top + 14}" font-size="10" fill="#c0392b" text-anchor="end">— Unhedged</text>
        <text x="${w - pad.right - 4}" y="${pad.top + 28}" font-size="10" fill="#d4762a" text-anchor="end">— Hedged</text>
      </svg>`;
    })();

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fuel Hedging Advisory Report — ${escapeHtml(company.name)}</title>
  <style>
    @page { size: Letter; margin: 0.5in; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; color: #0a0f1c; max-width: 850px; margin: 0 auto; padding: 28px 16px; font-size: 13px; line-height: 1.55; }
    h1 { font-size: 30px; margin: 0; letter-spacing: -0.02em; }
    h2 { font-size: 18px; color: #0a0f1c; margin-top: 36px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #d4762a; letter-spacing: -0.01em; }
    h3 { font-size: 14px; margin-top: 18px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th { background: #f7f7f5; padding: 7px 10px; text-align: left; border-bottom: 2px solid #e6e6e2; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #5b6477; }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0ec; font-size: 12px; }
    .right { text-align: right; }
    .pos { color: #0d8a4b; font-weight: 600; }
    .neg { color: #c0392b; font-weight: 600; }
    .cap { text-transform: capitalize; }
    .recommended-row { background: #fbece0; font-weight: 600; }
    .spot-row { background: #fbece0; font-weight: 600; }
    .cover { background: linear-gradient(135deg, #0b1220 0%, #111a2f 100%); color: #fff; padding: 64px 48px; margin: -28px -16px 28px; page-break-after: always; }
    .cover .badge { display: inline-block; background: rgba(212,118,42,0.22); color: #f4b07a; padding: 5px 14px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
    .cover h1 { font-size: 42px; line-height: 1.05; margin: 20px 0 12px; color: #fff; }
    .cover .sub { color: rgba(255,255,255,0.6); font-size: 15px; max-width: 540px; }
    .cover .meta { margin-top: 56px; color: rgba(255,255,255,0.5); font-size: 12px; }
    .cover .meta strong { color: #fff; }
    .summary-card { background: #fbece0; border: 1px solid #d4762a; border-radius: 12px; padding: 18px 22px; margin: 14px 0; }
    .summary-card h3 { color: #b86620; margin-top: 0; }
    .highlight { background: #d9f0e1; border: 1px solid #0d8a4b; border-radius: 12px; padding: 18px 22px; margin: 14px 0; }
    .warning { background: #faecc8; border: 1px solid #b07d0b; border-radius: 12px; padding: 18px 22px; margin: 14px 0; }
    .bottom-line { background: #f7f7f5; border-left: 4px solid #0a0f1c; padding: 16px 20px; margin: 14px 0; border-radius: 0 8px 8px 0; }
    .kpi-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .kpi { flex: 1 1 140px; background: #f7f7f5; border: 1px solid #e6e6e2; border-radius: 10px; padding: 12px 14px; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #5b6477; font-weight: 600; }
    .kpi-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
    .kpi-sub { font-size: 11px; color: #5b6477; margin-top: 2px; }
    .step { background: #f7f7f5; border-left: 4px solid #d4762a; padding: 14px 18px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .step-num { display: inline-block; background: #d4762a; color: #fff; width: 22px; height: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 11px; font-weight: 700; margin-right: 8px; }
    .disclaimer { font-size: 10.5px; color: #5b6477; margin: 4px 0; line-height: 1.5; }
    .src-list { font-size: 10.5px; color: #5b6477; line-height: 1.6; }
    .src-list a { color: #b86620; text-decoration: none; font-weight: 600; }
    @media print {
      body { padding: 0; }
      .cover { margin: -0.5in -0.5in 28px; padding: 64px 48px; }
      .summary-card, .highlight, .warning, .step, .bottom-line { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>

  <div class="cover">
    <span class="badge">CONFIDENTIAL — Series 65/66 Advisory Material</span>
    <h1>Fuel Cost Hedging<br/>Advisory Report</h1>
    <p class="sub">Prepared for <strong style="color:#fff">${escapeHtml(company.name)}</strong> &mdash; an institutional-grade analysis of fuel price exposure, ETF + ETF options strategies, scenario modeling, and step-by-step implementation.</p>
    <div class="meta">
      <p><strong>Date</strong> &nbsp;${today}</p>
      <p><strong>Client</strong> &nbsp;${escapeHtml(company.name)} &mdash; ${escapeHtml(company.company_type)} &mdash; ${escapeHtml(company.address_state)}</p>
      <p><strong>Adviser</strong> &nbsp;GasHedge Advisory &mdash; Series 65/66 Investment Adviser</p>
      <p><strong>Scope</strong> &nbsp;ETF allocation + listed ETF options. No Series 3 products.</p>
    </div>
  </div>

  <h2>1. Executive Summary</h2>
  <div class="bottom-line">
    <p style="margin:0 0 8px;font-size:14px"><strong>Recommendation:</strong> A <strong>${(hedgeRatio * 100).toFixed(0)}% hedge using ${productTicker}</strong>${recommendedTier ? ` at the ${recommendedTier.tier} tier` : ""}, layered with an <strong>${selectedOption.display_name}</strong> overlay for tighter risk control. Buy <strong>${position.shares_needed.toLocaleString()} shares of ${productTicker}</strong> for <strong>$${fmtMoney(position.dollar_notional)}</strong>. Hedge starts saving money when ${fuelType} rises above <strong>$${fmtPrice(detailed.breakeven.fuel_price_per_gallon)}/gal</strong>.</p>
    <p style="margin:0;font-size:12px;color:#5b6477">All recommendations fall under the adviser's Series 65/66 registration. Client executes through their own brokerage or via managed-account authorization. The adviser does not collect commissions on options trades.</p>
  </div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Fuel Type</div><div class="kpi-value cap">${fuelType}</div></div>
    <div class="kpi"><div class="kpi-label">Monthly Gallons</div><div class="kpi-value">${fmtMoney(monthlyGallons)}</div></div>
    <div class="kpi"><div class="kpi-label">Current Price</div><div class="kpi-value">$${fmtPrice(fuelPrice)}<span style="font-size:12px">/gal</span></div></div>
    <div class="kpi"><div class="kpi-label">Annual Fuel Cost</div><div class="kpi-value">$${fmtMoney(annualCost)}</div></div>
    <div class="kpi"><div class="kpi-label">Fleet</div><div class="kpi-value">${company.fleet_size}</div><div class="kpi-sub">vehicles</div></div>
    ${company.annual_revenue ? `<div class="kpi"><div class="kpi-label">Fuel % Revenue</div><div class="kpi-value">${((annualCost / company.annual_revenue) * 100).toFixed(1)}%</div></div>` : ""}
  </div>

  <h2>2. Current Fuel Exposure</h2>
  <p style="color:#5b6477;font-size:13px;margin:0 0 12px">Today's run-rate, and how it changes if fuel moves against the business.</p>
  <table>
    <thead><tr><th>Fuel price scenario</th><th>$/Gal</th><th class="right">Annual cost</th><th class="right">Δ vs today</th></tr></thead>
    <tbody>
      ${[0, 0.1, 0.2, 0.4, 0.6].map((chg) => {
        const newPrice = fuelPrice * (1 + chg);
        const newCost = monthlyGallons * 12 * newPrice;
        const delta = newCost - annualCost;
        return `<tr>
          <td><strong>${chg === 0 ? "Today" : `+${(chg * 100).toFixed(0)}% fuel`}</strong></td>
          <td>$${fmtPrice(newPrice)}</td>
          <td class="right">$${fmtMoney(newCost)}</td>
          <td class="right ${delta > 0 ? "neg" : ""}">${delta > 0 ? "+" : ""}$${fmtMoney(delta)}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <h2>3. Recommended ETF Allocation</h2>
  <p style="color:#5b6477;font-size:13px;margin:0 0 12px">Three coverage tiers. The recommended tier is highlighted.</p>
  <table>
    <thead><tr><th>Tier</th><th>Hedge %</th><th>ETF</th><th class="right">Shares</th><th class="right">Investment</th><th class="right">Annual cost</th></tr></thead>
    <tbody>${strategyRows}</tbody>
  </table>
  ${etfMeta ? `<div class="summary-card">
    <h3 style="margin-bottom:6px">${escapeHtml(etfMeta.name)} (${etfMeta.ticker})</h3>
    <p style="margin:0;font-size:12px;color:#5b6477">Issuer: ${escapeHtml(etfMeta.issuer)} &middot; ${escapeHtml(etfMeta.structure)} &middot; ${escapeHtml(etfMeta.tax_form)} &middot; expense ${(etfMeta.expense_ratio * 100).toFixed(2)}% &middot; AUM $${etfMeta.aum_millions}M &middot; ${etfMeta.liquidity_class} liquidity &middot; verified ${etfMeta.last_verified}</p>
    <p style="margin:8px 0 0;font-size:12px">${escapeHtml(etfMeta.description)}</p>
  </div>` : ""}

  <h2>4. Recommended ETF Options Overlay</h2>
  <div class="summary-card">
    <h3 style="margin-bottom:6px">${escapeHtml(selectedOption.display_name)}</h3>
    <p style="margin:0;font-size:12px">${escapeHtml(selectedOption.description)}</p>
  </div>
  <table>
    <thead><tr><th>Side</th><th>Type</th><th>Strike</th><th class="right">Contracts</th><th class="right">Premium/sh</th><th class="right">Delta</th><th class="right">Theta</th></tr></thead>
    <tbody>${legRows}</tbody>
  </table>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Net Premium</div><div class="kpi-value">${escapeHtml(selectedOption.total_premium_label)}</div></div>
    <div class="kpi"><div class="kpi-label">Max Loss</div><div class="kpi-value">${typeof selectedOption.max_loss === "number" ? `$${fmtMoney(selectedOption.max_loss)}` : escapeHtml(String(selectedOption.max_loss))}</div></div>
    <div class="kpi"><div class="kpi-label">Max Gain</div><div class="kpi-value">${typeof selectedOption.max_gain === "number" ? `$${fmtMoney(selectedOption.max_gain)}` : escapeHtml(String(selectedOption.max_gain))}</div></div>
    <div class="kpi"><div class="kpi-label">Breakeven (ETF)</div><div class="kpi-value">${selectedOption.breakeven_etf_price ? `$${selectedOption.breakeven_etf_price.toFixed(2)}` : "—"}</div></div>
    <div class="kpi"><div class="kpi-label">Days to Expiry</div><div class="kpi-value">${selectedOption.expiry_days}d</div></div>
  </div>
  <p style="font-size:12px;color:#5b6477;margin:8px 0"><strong>Why this structure:</strong> ${escapeHtml(selectedOption.rationale)}</p>

  <h3>Alternative ETF Options Structures</h3>
  <table>
    <thead><tr><th>Strategy</th><th class="right">Net premium</th><th class="right">Max loss</th><th class="right">Max gain</th></tr></thead>
    <tbody>
      ${optionsStrategies.filter((s) => s.strategy_key !== selectedOption.strategy_key).slice(0, 4).map((s) => `<tr>
        <td><strong>${escapeHtml(s.display_name)}</strong></td>
        <td class="right">${escapeHtml(s.total_premium_label)}</td>
        <td class="right">${typeof s.max_loss === "number" ? `$${fmtMoney(s.max_loss)}` : escapeHtml(String(s.max_loss))}</td>
        <td class="right">${typeof s.max_gain === "number" ? `$${fmtMoney(s.max_gain)}` : escapeHtml(String(s.max_gain))}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <h2>5. Scenario Analysis &mdash; What If Fuel Prices Move?</h2>
  <p style="color:#5b6477;font-size:13px;margin:0 0 8px">We sweep the underlying ETF across a range from -30% to +60% and price the option payoff at each level.</p>
  ${chartSvg}
  <table>
    <thead><tr><th>ETF</th><th>Fuel Δ</th><th>$/Gal</th><th class="right">Unhedged</th><th class="right">Option P&amp;L</th><th class="right">Hedged</th><th class="right">Hedge Value</th></tr></thead>
    <tbody>${optionScenarioRows}</tbody>
  </table>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Best-case savings</div><div class="kpi-value pos">+$${fmtMoney(optionScenarios.best_case_savings)}</div><div class="kpi-sub">if fuel rises to top of range</div></div>
    <div class="kpi"><div class="kpi-label">Worst-case</div><div class="kpi-value ${optionScenarios.worst_case_savings >= 0 ? "pos" : "neg"}">${optionScenarios.worst_case_savings >= 0 ? "+" : ""}$${fmtMoney(optionScenarios.worst_case_savings)}</div><div class="kpi-sub">if fuel falls to bottom of range</div></div>
    <div class="kpi"><div class="kpi-label">Breakeven fuel</div><div class="kpi-value">${optionScenarios.breakeven_fuel_price ? `$${optionScenarios.breakeven_fuel_price.toFixed(3)}` : "—"}<span style="font-size:11px">/gal</span></div></div>
    <div class="kpi"><div class="kpi-label">Correlation</div><div class="kpi-value">${(correlation * 100).toFixed(0)}%</div><div class="kpi-sub">ETF ↔ retail</div></div>
  </div>

  <h2>6. ETF-Only Scenario (without options overlay)</h2>
  <p style="color:#5b6477;font-size:13px;margin:0 0 8px">If the client opts out of the options overlay, here are projected costs under the pure ETF allocation at the recommended ${(hedgeRatio * 100).toFixed(0)}% coverage.</p>
  <table>
    <thead><tr><th>Price Δ</th><th>$/Gal</th><th class="right">Unhedged</th><th class="right">Hedged</th><th class="right">Savings</th></tr></thead>
    <tbody>${scenarioRows}</tbody>
  </table>
  <p style="font-size:12px;color:#5b6477;margin-top:8px">Breakeven: <strong>$${fmtPrice(detailed.breakeven.fuel_price_per_gallon)}/gal</strong> &mdash; a <strong>+${(detailed.breakeven.price_change_pct * 100).toFixed(1)}%</strong> move from today's price.</p>

  <h2>7. Advisor Compensation (Transparency)</h2>
  ${deals.length > 0 ? `<table>
    <thead><tr><th>Deal</th><th>Fee Structure</th><th>Fee</th><th>Status</th><th class="right">Annual</th><th class="right">3-yr</th><th class="right">5-yr</th></tr></thead>
    <tbody>${dealRows}</tbody>
  </table>
  <div class="highlight">
    <p style="margin:0;font-size:14px"><strong>Total annual advisor revenue from this client: $${fmtMoney(totalAnnualAdvisorRevenue)}</strong></p>
    <p style="margin:6px 0 0;font-size:12px">3-year value $${fmtMoney(totalAnnualAdvisorRevenue * 3)} &middot; 5-year value $${fmtMoney(totalAnnualAdvisorRevenue * 5)}. The adviser collects no commissions on options or ETF trades.</p>
  </div>` : `<div class="warning">
    <p style="margin:0;font-size:13px"><strong>No deal on file.</strong> Once a fee arrangement is established in the GasHedge deals page, it will appear here with full compensation transparency.</p>
  </div>`}

  <h2>8. Step-by-Step Implementation</h2>
  <div class="step">
    <p style="margin:0"><span class="step-num">1</span><strong>Open a brokerage account</strong></p>
    <p style="margin:8px 0 0;font-size:12px">Open a standard taxable account at Schwab, Fidelity, or Interactive Brokers. Use the company's legal name + EIN. Most accounts open in 1&ndash;3 business days. <strong>Important:</strong> request <strong>options trading approval Level 2</strong> (long calls, long puts) and <strong>Level 3</strong> (spreads, short premium) for the multi-leg structures.</p>
  </div>
  <div class="step">
    <p style="margin:0"><span class="step-num">2</span><strong>Fund the account</strong></p>
    <p style="margin:8px 0 0;font-size:12px">Transfer <strong>$${fmtMoney(position.dollar_notional)}</strong> for the ${position.shares_needed.toLocaleString()} ${productTicker} shares + cash for the option premium (<strong>${escapeHtml(selectedOption.total_premium_label)}</strong>). Total funding need: <strong>~$${fmtMoney(position.dollar_notional + Math.max(0, selectedOption.total_premium))}</strong>. ACH (2&ndash;3 days) or wire (same-day).</p>
  </div>
  <div class="step">
    <p style="margin:0"><span class="step-num">3</span><strong>Buy the ETF</strong></p>
    <p style="margin:8px 0 0;font-size:12px">Place a <strong>limit order</strong> during regular market hours (9:30 AM&ndash;4:00 PM ET) for <strong>${position.shares_needed.toLocaleString()} shares of ${productTicker}</strong> near the current bid/ask. ${productTicker} averages ${(((CORRELATION[fuelType] || {})[productTicker] || 0.8) * 100).toFixed(0)}% correlation to retail ${fuelType}. Settlement T+1.</p>
  </div>
  <div class="step">
    <p style="margin:0"><span class="step-num">4</span><strong>Place the options legs</strong></p>
    <p style="margin:8px 0 0;font-size:12px">Execute as a single multi-leg order if your broker supports it (Schwab, IB do; some Fidelity accounts need separate orders):</p>
    <ul style="margin:6px 0 0;padding-left:24px;font-size:12px">
      ${selectedOption.legs.map((leg) => `<li><strong>${leg.side === "long" ? "BUY" : "SELL"}</strong> ${leg.contracts} ${productTicker} $${leg.strike.toFixed(2)} ${leg.option_type === "call" ? "CALL" : "PUT"} expiring ~${selectedOption.expiry_days} days out @ limit price near $${leg.premium_per_share.toFixed(2)}/share</li>`).join("")}
    </ul>
    <p style="margin:8px 0 0;font-size:11px;color:#5b6477">Confirm strike, expiration, and premium against the broker's live chain. Reject if fill price moves &gt;5% from the quoted mid.</p>
  </div>
  <div class="step">
    <p style="margin:0"><span class="step-num">5</span><strong>Monitor weekly</strong></p>
    <p style="margin:8px 0 0;font-size:12px">Each Friday review: (a) ETF position value vs. fuel costs, (b) days-to-expiry on each option leg, (c) ${fuelType} retail trend from EIA.gov, (d) ETF-to-retail correlation (alert if it drops below 0.70). Set broker price alerts at ±10% moves.</p>
  </div>
  <div class="step">
    <p style="margin:0"><span class="step-num">6</span><strong>Roll options 30 days before expiry</strong></p>
    <p style="margin:8px 0 0;font-size:12px">When options reach 30 days to expiry: close existing legs, open new legs at the same or adjusted strikes for the next quarter. Re-run this report for updated structure based on then-current ETF price and IV.</p>
  </div>
  <div class="step">
    <p style="margin:0"><span class="step-num">7</span><strong>Rebalance ETF quarterly</strong></p>
    <p style="margin:8px 0 0;font-size:12px">Formula: (monthly gallons × current fuel price × 12 × ${(hedgeRatio * 100).toFixed(0)}%) ÷ current ETF price = target shares. If actual shares drift &gt;10% from target, buy/sell to match.</p>
  </div>
  <div class="step">
    <p style="margin:0"><span class="step-num">8</span><strong>Exit and tax handling</strong></p>
    <p style="margin:8px 0 0;font-size:12px">Unwind: sell ETF via limit order (T+1 settlement); let options expire worthless or close early. <strong>Tax:</strong> ${productTicker} issues K-1 with Section 1256 60% LTCG / 40% STCG treatment. Equity option legs follow standard cap-gains rules. Consult a CPA familiar with commodity LPs.</p>
  </div>

  <h3>Recommended Timeline</h3>
  <table>
    <thead><tr><th>Week</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td><strong>Week 1</strong></td><td>Open brokerage account, request options Level 2/3 approval, initiate funding</td></tr>
      <tr><td><strong>Week 2</strong></td><td>Account funded, place ETF buy + multi-leg options order</td></tr>
      <tr><td><strong>Week 3</strong></td><td>Confirm fills, set price alerts, schedule weekly review</td></tr>
      <tr><td><strong>Monthly</strong></td><td>Brief check-in: hedge value vs. fuel costs</td></tr>
      <tr><td><strong>Quarterly</strong></td><td>Rebalance ETF, evaluate options roll</td></tr>
      <tr><td><strong>30 days before expiry</strong></td><td>Roll options to next quarter</td></tr>
      <tr><td><strong>Annually</strong></td><td>Full strategy review, K-1 + 1256 filings</td></tr>
    </tbody>
  </table>

  <h2>9. Sources &amp; Methodology</h2>
  <p class="src-list">
    Live ETF quotes via <a href="https://finance.yahoo.com/">Yahoo Finance</a> (delayed up to 15 min).
    Retail gasoline / diesel prices from the <a href="https://www.eia.gov/petroleum/gasdiesel/">U.S. Energy Information Administration</a>.
    ETF reference data (expense, AUM, structure) from <a href="https://www.uscfinvestments.com/">USCF Investments</a> prospectus and fact sheets, cross-verified against <a href="https://www.etf.com/">ETF.com</a> and <a href="https://www.aaii.com/etfdata">AAII</a>.
    Option pricing uses Black-Scholes (<a href="https://www.jstor.org/stable/1831029">Black &amp; Scholes, 1973</a>) with risk-free rate from <a href="https://fred.stlouisfed.org/series/TB3MS">FRED 3-month T-bill</a>.
    Equity options contract specifications: <a href="https://www.cboe.com/tradable_products/options/">CBOE</a>.
    Regulatory framework: SEC Investment Adviser Disclosures (<a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&amp;type=ADV">Form ADV Part 2A</a>).
  </p>

  <h2>10. Disclosures</h2>
  <p class="disclaimer"><strong>Scope.</strong> This analysis is provided under a Series 65/66 investment-adviser registration. Securities recommended are limited to registered investment products (ETFs) and listed equity options on those ETFs. The adviser does NOT offer commodity futures, swaps, or options on futures (Series 3 products). The client executes through their own brokerage account or via a managed account where the adviser holds appropriate authorization. The adviser does not collect commissions on options trades.</p>
  <p class="disclaimer"><strong>Risk.</strong> Past performance does not guarantee future results. Commodity ETFs involve significant risks including contango losses, tracking error, and may not perfectly correlate with retail fuel prices. Options carry the risk of total premium loss for buyers and the risk of assignment for sellers. The client's brokerage account must be approved for the relevant options trading level (Level 2 for long calls/puts; Level 3 for spreads and short premium).</p>
  <p class="disclaimer"><strong>Tax.</strong> ${productTicker} is a limited partnership and issues Schedule K-1 tax forms. Long-term holdings receive blended 60% LTCG / 40% STCG treatment regardless of holding period (Section 1256). Options on these ETFs may have different tax treatment. Consult a qualified tax professional.</p>
  <p class="disclaimer"><strong>Modeled values.</strong> Option premiums in this report are estimated via Black-Scholes with assumed implied volatility per ticker. Actual market bid/ask spreads may differ materially. Live underlying prices delayed up to 15 minutes. Hedging strategies should be evaluated based on each business's specific financial situation, risk tolerance, and fuel cost exposure. Not all strategies are suitable for all businesses. The adviser's fee schedule and conflicts of interest are disclosed in Form ADV Part 2A.</p>
  <p class="disclaimer" style="margin-top:18px;padding-top:10px;border-top:1px solid #e6e6e2">Generated by GasHedge &middot; ${today} &middot; Report ID ${escapeHtml(company.name).replace(/\W+/g, "-").toLowerCase()}-${Date.now()}</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="hedging-report-${company.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.html"`,
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
