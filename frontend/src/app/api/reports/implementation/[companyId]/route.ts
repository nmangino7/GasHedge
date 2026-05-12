export const maxDuration = 30;
import { companyStore, dealStore, hedgingPlanStore } from "@/lib/store";
import { getCurrentPrice } from "@/lib/eia-service";
import { getETFPrice } from "@/lib/alpha-vantage";
import {
  calculateHedgePosition,
  calculateEtfLongCall,
  detailedScenarioAnalysis,
} from "@/lib/hedging-engine";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtPrice = (n: number) => n.toFixed(3);
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

const APPROACH_LABELS: Record<string, string> = {
  etf: "ETF Allocation",
  etf_options: "ETF Options Overlay",
};

const APPROACH_PLAIN: Record<string, string> = {
  etf: "Buying shares of a fuel-tracking exchange-traded fund. When fuel prices rise, the fund's share price rises too. We sell shares to offset higher fuel bills. Simplest approach.",
  etf_options: "Buying call options on the fuel-tracking ETF. Pay a one-time premium up front, capped downside (the premium), unlimited upside protection if fuel spikes. Series 65/66 advisory only — no Series 3 needed.",
};

const APPROACH_PROS: Record<string, string[]> = {
  etf: [
    "Only Series 65/66 needed (advisor's existing license)",
    "Liquid — sell any time during market hours",
    "No margin calls or expiry",
    "Works in any standard brokerage account",
  ],
  etf_options: [
    "Series 65/66 advisory — client executes in own brokerage",
    "Maximum loss capped at the premium paid",
    "Unlimited upside if fuel spikes",
    "Spreads (bull call, bear put) cut premium 40–60%",
  ],
};

const APPROACH_CONS: Record<string, string[]> = {
  etf: [
    "Tracking error vs retail fuel (~78–88% correlation)",
    "~1% annual expense ratio",
    "K-1 tax form required",
    "Contango losses possible",
  ],
  etf_options: [
    "Premium is a real cost if fuel stays flat",
    "Options expire — must roll positions to maintain coverage",
    "Client account must be options-approved (Level 2+)",
    "More complex pricing (strikes, IV, Greeks)",
  ],
};

const TIER_PLAIN: Record<string, { label: string; pct: string; explanation: string }> = {
  conservative: {
    label: "Conservative",
    pct: "25%",
    explanation: "We hedge a quarter of your annual fuel. If prices spike, three-quarters of your bill still rises — but the quarter we covered helps cushion the blow. Cheapest setup.",
  },
  moderate: {
    label: "Moderate",
    pct: "50%",
    explanation: "We hedge half. Half your fuel cost becomes predictable for budgeting and bidding. The other half stays flexible if prices fall. Most popular choice.",
  },
  aggressive: {
    label: "Aggressive",
    pct: "75%",
    explanation: "We hedge three-quarters. Almost all your fuel cost is locked in. Maximum protection from spikes — but you give up most upside if fuel falls.",
  },
};

const BROKERAGE_LABELS: Record<string, string> = {
  charles_schwab: "Charles Schwab",
  fidelity: "Fidelity",
  interactive_brokers: "Interactive Brokers",
  td_ameritrade: "TD Ameritrade",
  other: "Other",
};

const TIMING_LABELS: Record<string, string> = {
  immediately: "Immediately",
  next_month: "Next Month",
  next_quarter: "Next Quarter",
  custom: "Custom Date",
};

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annually: "Semi-Annually",
};

function planFromParams(url: URL) {
  return {
    approach: url.searchParams.get("approach") || "etf",
    tier: url.searchParams.get("tier") || "moderate",
    hedge_ratio: parseFloat(url.searchParams.get("hedge_ratio") || "0.5"),
    product_ticker: url.searchParams.get("product_ticker") || "UGA",
    brokerage: url.searchParams.get("brokerage") || "charles_schwab",
    brokerage_other: url.searchParams.get("brokerage_other") || null,
    start_timing: url.searchParams.get("start_timing") || "immediately",
    custom_date: url.searchParams.get("custom_date") || null,
    rebalance_frequency: url.searchParams.get("rebalance_frequency") || "quarterly",
    deal_id: url.searchParams.get("deal_id")
      ? Number(url.searchParams.get("deal_id"))
      : null,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const company = await companyStore.get(Number(companyId));
    if (!company)
      return new Response("Company not found", { status: 404 });

    const url = new URL(req.url);
    const planId = url.searchParams.get("plan_id");

    type PlanShape = {
      approach: string;
      tier: string;
      hedge_ratio: number;
      product_ticker: string;
      brokerage: string;
      brokerage_other: string | null;
      start_timing: string;
      custom_date: string | null;
      rebalance_frequency: string;
      deal_id: number | null;
    };

    let plan: PlanShape;
    if (planId) {
      const stored = await hedgingPlanStore.get(Number(planId));
      if (stored) {
        plan = stored;
      } else {
        plan = planFromParams(url);
      }
    } else {
      plan = planFromParams(url);
    }

    const fuelType = company.fuel_type === "diesel" ? "diesel" : "gasoline";
    const monthlyGallons =
      fuelType === "diesel"
        ? company.monthly_gallons_diesel || 0
        : company.monthly_gallons_gasoline || 0;

    const [fuelPriceRaw, etfPriceRaw] = await Promise.all([
      getCurrentPrice(fuelType, company.padd_region),
      plan.approach === "etf" ? getETFPrice(plan.product_ticker) : Promise.resolve(0),
    ]);
    const fuelPrice = fuelPriceRaw || 3.5;
    const etfPrice = etfPriceRaw || 50;

    let positionSummary: string;
    let upfrontCapital = 0;
    let annualHedgeCost = 0;
    let breakevenPrice = fuelPrice;

    if (plan.approach === "etf_options") {
      const lc = calculateEtfLongCall({
        monthlyGallons,
        fuelType,
        currentFuelPrice: fuelPrice,
        ticker: plan.product_ticker,
        etfPrice,
        hedgeRatio: plan.hedge_ratio,
        daysToExpiry: 120,
      });
      breakevenPrice = lc.breakeven_etf_price ?? etfPrice;
      upfrontCapital = lc.total_premium;
      annualHedgeCost = lc.total_premium;
      positionSummary = `Buy <strong>${lc.contracts} ${plan.product_ticker} call option contracts</strong> at $${(etfPrice).toFixed(2)} strike (ATM, ~120-day expiry). Total premium: <strong>$${fmtMoney(lc.total_premium)}</strong>. Max loss capped at premium. Series 65/66 advisory.`;
    } else {
      const pos = calculateHedgePosition(
        monthlyGallons,
        fuelType,
        plan.product_ticker,
        plan.hedge_ratio,
        fuelPrice,
        etfPrice
      );
      const detailed = detailedScenarioAnalysis(monthlyGallons, pos, fuelPrice);
      breakevenPrice = detailed.breakeven.fuel_price_per_gallon;
      upfrontCapital = pos.dollar_notional;
      annualHedgeCost = pos.annual_expense_cost;
      positionSummary = `Buy <strong>${pos.shares_needed} shares</strong> of <strong>${pos.product_ticker}</strong> (${pos.product_name}) at roughly $${pos.etf_price.toFixed(2)}/share.`;
    }

    const deals = await dealStore.list(undefined, company.id);
    const linkedDeal = plan.deal_id
      ? deals.find((d) => d.id === plan.deal_id)
      : deals[0];
    const advisorAnnualRevenue = linkedDeal?.annual_fee_revenue || 0;

    const annualFuelCost = monthlyGallons * 12 * fuelPrice;
    const tier = TIER_PLAIN[plan.tier] || TIER_PLAIN.moderate;
    const approachTitle = APPROACH_LABELS[plan.approach] || plan.approach;
    const startDate =
      plan.start_timing === "custom" && plan.custom_date
        ? plan.custom_date
        : TIMING_LABELS[plan.start_timing] || plan.start_timing;
    const brokerageLabel =
      plan.brokerage === "other"
        ? plan.brokerage_other || "Other"
        : BROKERAGE_LABELS[plan.brokerage] || plan.brokerage;

    const prosListHtml = APPROACH_PROS[plan.approach]
      .map((p) => `<li>${escapeHtml(p)}</li>`)
      .join("");
    const consListHtml = APPROACH_CONS[plan.approach]
      .map((c) => `<li>${escapeHtml(c)}</li>`)
      .join("");

    const compareTableRows = (["etf", "etf_options"] as const)
      .map((k) => {
        const isSelected = plan.approach === k;
        return `
          <tr style="${isSelected ? "background:#fbece0;" : ""}">
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;${isSelected ? "color:#b86620;" : ""}">
              ${APPROACH_LABELS[k]}${isSelected ? " ← selected" : ""}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${escapeHtml(APPROACH_PLAIN[k])}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">Series 65/66 advisory</td>
          </tr>
        `;
      })
      .join("");

    const advisorRow = (years: number) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${years} year${years === 1 ? "" : "s"}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#047857">$${fmtMoney(advisorAnnualRevenue * years)}</td>
      </tr>
    `;

    const dealLineHtml = linkedDeal
      ? `
      <p style="margin:0 0 8px 0;font-size:13px"><strong>Linked Deal #${linkedDeal.id}</strong>${linkedDeal.notes ? ` — ${escapeHtml(linkedDeal.notes)}` : ""}</p>
      <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280">
        Fee structure:
        <strong style="text-transform:capitalize">${linkedDeal.fee_structure.replace("_", " ")}</strong>
        ${linkedDeal.fee_structure === "aum_percentage" ? `· ${linkedDeal.fee_amount}% of $${fmtMoney(linkedDeal.aum_value || 0)} AUM` : linkedDeal.fee_structure === "subscription" ? `· $${fmtMoney(linkedDeal.fee_amount)}/month` : `· $${fmtMoney(linkedDeal.fee_amount)} flat`}
        · Status: <strong style="text-transform:capitalize">${linkedDeal.status}</strong>
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;max-width:400px">
        <thead>
          <tr><th style="padding:6px 12px;text-align:left;background:#f9fafb;border-bottom:2px solid #d1d5db;font-size:11px;text-transform:uppercase;color:#6b7280">Period</th>
              <th style="padding:6px 12px;text-align:right;background:#f9fafb;border-bottom:2px solid #d1d5db;font-size:11px;text-transform:uppercase;color:#6b7280">Advisor Revenue</th></tr>
        </thead>
        <tbody>
          ${advisorRow(1)}
          ${advisorRow(3)}
          ${advisorRow(5)}
        </tbody>
      </table>
    `
      : `
      <p style="margin:0;font-size:13px;color:#92400e"><strong>No deal on file yet.</strong> A typical 1.0-1.5% AUM fee on this hedge would generate roughly $${fmtMoney(upfrontCapital * 0.0125)}/year for the advisory practice.</p>
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Implementation Plan — ${escapeHtml(company.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; max-width: 900px; margin: 0 auto; padding: 40px 24px; font-size: 14px; line-height: 1.6; }
    h1 { font-size: 26px; margin-bottom: 4px; }
    h2 { font-size: 18px; color: #111827; margin-top: 36px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #4f46e5; }
    h3 { font-size: 15px; margin-top: 20px; margin-bottom: 8px; }
    p { margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    th { background: #f9fafb; padding: 8px 12px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .cover { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; border-radius: 12px; padding: 32px; margin-bottom: 32px; }
    .cover h1 { color: white; margin: 0; }
    .cover .subtitle { color: rgba(255,255,255,0.85); font-size: 16px; margin-top: 8px; }
    .summary-box { background: #f0f9ff; border: 2px solid #4f46e5; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .compensation-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }
    .pros { background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; }
    .cons { background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; }
    .pros h4, .cons h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .pros h4 { color: #15803d; }
    .cons h4 { color: #b91c1c; }
    .pros ul, .cons ul { margin: 0; padding-left: 20px; }
    .pros li, .cons li { font-size: 13px; margin-bottom: 4px; }
    .step { background: #f9fafb; border-left: 4px solid #4f46e5; padding: 16px 20px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .step-number { display: inline-block; background: #4f46e5; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 8px; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; margin: 12px 0; }
    .metric { background: #f3f4f6; border-radius: 8px; padding: 16px; }
    .metric-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 22px; font-weight: 700; color: #111827; }
    .disclaimer { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .no-print { background: #fef3c7; border: 1px dashed #d97706; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
    @media print { body { padding: 0; } .no-print { display: none; } .summary-box, .compensation-box, .pros, .cons, .step { break-inside: avoid; } .cover { break-after: page; } }
  </style>
  <script>
    window.addEventListener('load', () => { setTimeout(() => window.print(), 400); });
  </script>
</head>
<body>
  <div class="no-print">
    <strong>Save as PDF:</strong> Your browser&rsquo;s print dialog should open automatically. Choose &ldquo;Save as PDF&rdquo; as the destination, then save the file. If the dialog didn&rsquo;t appear, press Ctrl+P (Cmd+P on Mac).
  </div>

  <div class="cover">
    <h1>Fuel Hedging Implementation Plan</h1>
    <p class="subtitle">Prepared for ${escapeHtml(company.name)}</p>
    <p class="subtitle" style="margin-top:4px">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>

  <h2>1. What we&rsquo;re doing and why</h2>
  <p>Fuel costs you about <strong>$${fmtMoney(annualFuelCost)}/year</strong> (${fmtMoney(monthlyGallons)} gallons of ${fuelType} per month at $${fmtPrice(fuelPrice)}/gal). When fuel prices spike, that bill jumps. The plan below buys a financial product that <em>also</em> rises when fuel prices rise &mdash; so the gain offsets the bigger fuel bill.</p>
  <div class="summary-box">
    <h3 style="margin-top:0">Bottom line</h3>
    <p style="margin:0"><strong>Approach:</strong> ${escapeHtml(approachTitle)} &mdash; ${escapeHtml(APPROACH_PLAIN[plan.approach])}</p>
    <p style="margin:8px 0 0"><strong>Coverage:</strong> ${tier.label} (${tier.pct}). ${escapeHtml(tier.explanation)}</p>
    <p style="margin:8px 0 0"><strong>Action:</strong> ${positionSummary}</p>
  </div>

  <h2>2. The 3 ways to hedge fuel (and why we picked yours)</h2>
  <p>Every fuel-hedging plan picks one of these three approaches. The selected one is highlighted. The choice depends on the advisor&rsquo;s license, the client&rsquo;s appetite for complexity, and the size of the fuel bill.</p>
  <table>
    <thead><tr><th>Approach</th><th>How it works (no jargon)</th><th>License</th></tr></thead>
    <tbody>${compareTableRows}</tbody>
  </table>
  <div class="pros-cons">
    <div class="pros">
      <h4>${approachTitle} &mdash; Pros</h4>
      <ul>${prosListHtml}</ul>
    </div>
    <div class="cons">
      <h4>${approachTitle} &mdash; Cons</h4>
      <ul>${consListHtml}</ul>
    </div>
  </div>

  <h2>3. Your numbers</h2>
  <div class="metric-grid">
    <div class="metric"><div class="metric-label">Monthly Gallons</div><div class="metric-value">${fmtMoney(monthlyGallons)}</div></div>
    <div class="metric"><div class="metric-label">Current ${fuelType} Price</div><div class="metric-value">$${fmtPrice(fuelPrice)}</div></div>
    <div class="metric"><div class="metric-label">Annual Fuel Cost</div><div class="metric-value">$${fmtMoney(annualFuelCost)}</div></div>
    <div class="metric"><div class="metric-label">Hedge Coverage</div><div class="metric-value">${Math.round(plan.hedge_ratio * 100)}%</div></div>
    <div class="metric"><div class="metric-label">Up-front Capital</div><div class="metric-value">$${fmtMoney(upfrontCapital)}</div></div>
    <div class="metric"><div class="metric-label">Annual Hedge Cost</div><div class="metric-value">$${fmtMoney(annualHedgeCost)}</div></div>
    <div class="metric"><div class="metric-label">Breakeven ${fuelType} Price</div><div class="metric-value">$${fmtPrice(breakevenPrice)}</div></div>
    <div class="metric"><div class="metric-label">Brokerage</div><div class="metric-value" style="font-size:14px">${escapeHtml(brokerageLabel)}</div></div>
  </div>
  <p style="font-size:13px;color:#6b7280">In plain English: when ${fuelType} rises above $${fmtPrice(breakevenPrice)}/gal, the hedge starts saving the company money. Below that price, the hedge cost is the &ldquo;insurance premium&rdquo; for protection against bigger spikes.</p>

  <h2>4. How to actually do this (step by step)</h2>

  <div class="step">
    <p style="margin:0"><span class="step-number">1</span><strong>Open the brokerage account</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Open a standard taxable brokerage account at <strong>${escapeHtml(brokerageLabel)}</strong>. Use the company&rsquo;s name and EIN. Process takes 1&ndash;3 business days. ${plan.approach !== "etf" ? "<strong>Note:</strong> options/futures require a Series 3 license &mdash; if the advisor doesn&rsquo;t hold one, the trades must be placed by a Series 3-licensed person." : ""}</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">2</span><strong>Fund the account</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Transfer <strong>$${fmtMoney(upfrontCapital)}</strong>. Wire is same-day; ACH is 2&ndash;3 days. Once funds settle, we&rsquo;re ready to trade.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">3</span><strong>Place the opening trade</strong></p>
    <p style="margin:8px 0 0;font-size:13px">${positionSummary} Use a <strong>limit order</strong> set near the current market price during regular hours (9:30 AM &ndash; 4:00 PM ET). This avoids overpaying on a fast-moving market.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">4</span><strong>Set up monitoring</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Track weekly: (a) the position&rsquo;s value, (b) ${fuelType} prices via EIA.gov, (c) the correlation between the hedge and pump prices. Set price alerts on the broker platform for ±10% moves.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">5</span><strong>Rebalance ${FREQUENCY_LABELS[plan.rebalance_frequency].toLowerCase()}</strong></p>
    <p style="margin:8px 0 0;font-size:13px">Recalculate the target position each ${FREQUENCY_LABELS[plan.rebalance_frequency].toLowerCase().replace(/-/g, " ")} cycle: (monthly gallons × current fuel price × 12 × ${Math.round(plan.hedge_ratio * 100)}%) ÷ current price. If actual position drifts more than 10% from target, buy or sell to correct.</p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">6</span><strong>Cost breakdown</strong></p>
    <p style="margin:8px 0 0;font-size:13px">
      ${plan.approach === "etf" ? `Annual ETF expense: <strong>$${fmtMoney(annualHedgeCost)}/yr</strong><br>` : ""}
      ${plan.approach === "etf_options" ? `Premium (paid up front): <strong>$${fmtMoney(annualHedgeCost)}</strong><br>` : ""}
      Trading commissions: typically $0 at major brokers<br>
      Advisor fee: see compensation transparency section below<br>
      <strong>Total run-rate cost: $${fmtMoney(annualHedgeCost + advisorAnnualRevenue)}/year</strong>
    </p>
  </div>

  <div class="step">
    <p style="margin:0"><span class="step-number">7</span><strong>Exit strategy</strong></p>
    <p style="margin:8px 0 0;font-size:13px">
      ${plan.approach === "etf" ? `To unwind, sell shares using a limit order during market hours. Settlement is T+1. <strong>Tax note:</strong> ${plan.product_ticker} issues a K-1 form &mdash; gains taxed at a blended 60% long-term / 40% short-term rate.` : ""}
      ${plan.approach === "etf_options" ? `Options expire on the chosen expiration date. Either let them expire worthless (if out of the money) or close early by selling. Roll into new contracts to maintain coverage. Series 65/66 advisory only &mdash; client executes via own brokerage.` : ""}
    </p>
  </div>

  <h2>5. Advisor compensation (transparency)</h2>
  <p style="font-size:13px;color:#6b7280">As a fiduciary, the advisor discloses every dollar of compensation tied to this engagement.</p>
  <div class="compensation-box">
    ${dealLineHtml}
  </div>

  <h2>6. Recommended timeline</h2>
  <table>
    <thead><tr><th>Week</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 1</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Open brokerage account, initiate funding transfer</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 2</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Account funded; place opening trade with limit order</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Week 3</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Confirm position, set up price alerts and tracking</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">Monthly</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Brief check-in: hedge value vs. fuel costs</td></tr>
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${FREQUENCY_LABELS[plan.rebalance_frequency]}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">Rebalance position if drift &gt; 10%</td></tr>
      <tr><td style="padding:6px 12px;font-weight:600">Annually</td><td style="padding:6px 12px">Full strategy review, tax filing (K-1 / 1256 forms)</td></tr>
    </tbody>
  </table>
  <p style="font-size:13px;color:#6b7280">Start date: <strong>${escapeHtml(startDate)}</strong></p>

  <h2>7. Important disclosures</h2>
  <p class="disclaimer">This plan is provided under an advisory relationship for informational purposes. Securities recommended are limited to registered investment products (ETFs) and listed equity options on those ETFs &mdash; all under the adviser&rsquo;s Series 65/66 registration. The adviser does NOT offer commodity futures, swaps, or options on futures (Series 3 products). Past performance does not guarantee future results.</p>
  <p class="disclaimer">Commodity ETFs structured as limited partnerships issue Schedule K-1 tax forms. Gains are typically taxed 60% long-term / 40% short-term, regardless of holding period (Section 1256). Hedging strategies should be evaluated against each company&rsquo;s specific financial situation and risk tolerance.</p>
  <p class="disclaimer">HYPOTHETICAL PERFORMANCE RESULTS have many inherent limitations. ETF-based hedging involves market risk and does not guarantee cost savings. Futures involve margin call risk and theoretically unlimited loss exposure.</p>
  <p class="disclaimer" style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb">Generated by GasHedge &mdash; ${new Date().toISOString()}${planId ? ` &mdash; Plan ID #${planId}` : ""}</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[Implementation Report] Error:", e);
    return new Response(
      `Failed to generate implementation plan: ${e instanceof Error ? e.message : String(e)}`,
      { status: 500 }
    );
  }
}
