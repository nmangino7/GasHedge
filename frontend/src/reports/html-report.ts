// Client-ready PDF report as branded, print-optimized HTML (the browser's
// "Save as PDF" target). Driven by the same CompanyAnalysis as the PPTX deck so
// the two always agree, use the CORRECTED engine numbers, and carry the
// compliance disclaimers — with no Series-3 / commodity-futures language.

import type { CompanyAnalysis } from "@/services/company-analysis";
import { DISCLAIMERS } from "@/domain/reference/disclaimers";
import { money, pct, pctValue, signedMoney, todayLong } from "./format";
import type { DeckBranding } from "./pptx-deck";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function companyTypeLabel(t: string): string {
  const map: Record<string, string> = {
    landscaping: "Landscaping / Lawn Care",
    trucking_local: "Local / Regional Trucking",
    trucking_longhaul: "Long-Haul Trucking",
    delivery: "Delivery / Last Mile",
    construction: "Construction",
    other: "Fleet Operator",
  };
  return map[t] ?? "Fleet Operator";
}

export function buildHtmlReport(a: CompanyAnalysis, b: DeckBranding): string {
  const prov = a.provenance.overall;
  const provLabel =
    prov === "live" ? "Live market data" : prov === "cached" ? "Recent market data" : "Estimated (fallback) data";

  const shockRows = a.exposure.scenarios
    .map(
      (s) => `<tr><td>${esc(s.label)}</td><td>${money(a.market.fuelPrice * (1 + s.priceChangePct), 2)}/gal</td><td class="warn">${signedMoney(s.additionalAnnualCost)}</td></tr>`
    )
    .join("");

  const scenarioRows = a.scenarios.rows
    .map(
      (r) => `<tr><td>${pctValue(r.etfChangePct * 100, 0)}</td><td>${pctValue(r.fuelChangePct * 100, 0)}</td><td>${money(r.unhedgedAnnualCost)}</td><td>${money(r.hedgedAnnualCost)}</td><td class="${r.savings >= 0 ? "good" : "warn"}">${signedMoney(r.savings)}</td></tr>`
    )
    .join("");

  const optionKeys = ["long_call", "bull_call_spread", "collar"];
  const optionRows = optionKeys
    .map((k) => a.strategies.find((s) => s.strategyKey === k))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map(
      (s) => `<tr><td><strong>${esc(s.displayName.replace(/\(.*\)/, "").trim())}</strong></td><td>${s.totalPremium >= 0 ? `${money(s.totalPremium)} debit` : `${money(-s.totalPremium)} credit`}</td><td>${typeof s.maxLoss === "number" ? money(s.maxLoss) : esc(String(s.maxLoss))}</td><td>${s.breakevenEtfPrice != null ? money(s.breakevenEtfPrice, 2) : "—"}</td><td class="muted">${esc(s.bestFor)}</td></tr>`
    )
    .join("");

  const disclaimers = DISCLAIMERS.map((d) => `<li>${esc(d)}</li>`).join("");

  const breakeven = a.scenarios.breakeven
    ? `<p class="note">Breakeven: the hedge covers its own cost once ${esc(a.market.etfTicker)} rises about <strong>${pctValue(a.scenarios.breakeven.etfChangePct * 100, 1)}</strong> (retail ${esc(a.fuelType)} ≈ ${money(a.scenarios.breakeven.fuelPrice, 2)}/gal).</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Fuel Hedging Plan — ${esc(a.company.name)}</title>
<style>
  :root{--ink:#0f172a;--sub:#64748b;--accent:#0369a1;--good:#047857;--warn:#b45309;--line:#e2e8f0;--panel:#f8fafc;}
  *{box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--ink);margin:0;padding:0 40px 60px;font-size:13px;line-height:1.5;}
  .bar{height:6px;background:var(--accent);margin:0 -40px 28px;}
  header.cover{padding:28px 0 18px;border-bottom:2px solid var(--line);}
  .kicker{color:var(--accent);font-weight:700;letter-spacing:2px;font-size:12px;text-transform:uppercase;}
  h1{font-size:30px;margin:6px 0 4px;}
  .meta{color:var(--sub);font-size:14px;}
  .firm{float:right;text-align:right;color:var(--accent);font-weight:700;}
  h2{font-size:16px;margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line);}
  .cards{display:flex;gap:12px;margin:8px 0 4px;}
  .card{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px;}
  .card .l{color:var(--sub);font-size:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;}
  .card .v{font-size:22px;font-weight:700;margin-top:2px;}
  .card .s{color:var(--sub);font-size:11px;}
  table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);}
  th{background:var(--panel);color:var(--sub);text-transform:uppercase;font-size:10px;letter-spacing:.5px;}
  .good{color:var(--good);font-weight:600;} .warn{color:var(--warn);font-weight:600;} .muted{color:var(--sub);}
  .note{color:var(--sub);font-style:italic;margin:8px 0;}
  ol{padding-left:20px;} ol li{margin:6px 0;}
  .disc{margin-top:24px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 18px;}
  .disc h3{font-size:12px;text-transform:uppercase;color:var(--sub);margin:0 0 8px;}
  .disc ul{padding-left:18px;margin:0;} .disc li{font-size:10px;color:var(--sub);margin:5px 0;}
  .foot{margin-top:18px;color:var(--sub);font-size:10px;border-top:1px solid var(--line);padding-top:8px;}
  @media print{body{padding:0 18px;} .bar{margin:0 -18px 20px;} h2{page-break-after:avoid;} table,.disc{page-break-inside:avoid;} .noprint{display:none;}}
  .toolbar{margin:14px 0;} .toolbar button{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer;}
</style></head>
<body>
<div class="bar"></div>
<div class="toolbar noprint"><button onclick="window.print()">Save as PDF / Print</button></div>
<header class="cover">
  <div class="firm">${esc(b.firmName)}${b.advisorName ? `<br/><span style="font-weight:400;color:#64748b">${esc(b.advisorName)}</span>` : ""}</div>
  <div class="kicker">Fuel Hedging Plan</div>
  <h1>${esc(a.company.name)}</h1>
  <div class="meta">${esc(companyTypeLabel(a.company.company_type))} &middot; ${a.company.fleet_size} vehicles &middot; ${esc(a.regionLabel)} &middot; ${todayLong()}</div>
</header>

<h2>Your fuel-price exposure</h2>
<div class="cards">
  <div class="card"><div class="l">Annual fuel cost</div><div class="v">${money(a.exposure.annualFuelCost)}</div><div class="s">${money(a.exposure.monthlyFuelCost)}/mo</div></div>
  <div class="card"><div class="l">Fuel % of revenue</div><div class="v">${a.exposure.fuelPctRevenue != null ? pctValue(a.exposure.fuelPctRevenue) : "n/a"}</div><div class="s">of annual revenue</div></div>
  <div class="card"><div class="l">Current price</div><div class="v">${money(a.market.fuelPrice, 2)}</div><div class="s">per gallon (${esc(a.fuelType)})</div></div>
  <div class="card"><div class="l">Risk score</div><div class="v">${a.riskScore.overallScore}/100</div><div class="s">${esc(a.riskScore.riskLevel)}</div></div>
</div>
<table><thead><tr><th>Price increase</th><th>New price / gal</th><th>Added annual fuel cost</th></tr></thead><tbody>${shockRows}</tbody></table>

<h2>Recommended ETF hedge — ${esc(a.market.etfTicker)} at ${pct(a.coverageRatio, 0)} coverage</h2>
<div class="cards">
  <div class="card"><div class="l">Shares to hold</div><div class="v">${a.hedgeSize.sharesNeeded.toLocaleString()}</div><div class="s">${money(a.hedgeSize.etfNotional)} notional</div></div>
  <div class="card"><div class="l">Hedge ratio (β)</div><div class="v">${a.hedgeRatio.beta.toFixed(2)}</div><div class="s">ETF $ per fuel $</div></div>
  <div class="card"><div class="l">Hedge effectiveness</div><div class="v">${pct(a.hedgeRatio.hedgeEffectiveness, 0)}</div><div class="s">of variance removed</div></div>
  <div class="card"><div class="l">Annual cost</div><div class="v">${money(a.hedgeSize.annualExpenseDrag)}</div><div class="s">fund expense drag</div></div>
</div>
<p>We size the hedge with the <strong>minimum-variance hedge ratio</strong> β = ρ·(σ<sub>fuel</sub>/σ<sub>ETF</sub>) = ${a.hedgeRatio.beta.toFixed(2)}. Because retail ${esc(a.fuelType)} is less volatile than the futures-tracking ETF, you hold <em>less</em> ETF notional than fuel notional — the realistic amount. This hedge removes roughly <strong>${pct(a.hedgeRatio.hedgeEffectiveness, 0)}</strong> of fuel-cost variance; about <strong>${pct(a.hedgeRatio.basisRisk, 0)}</strong> remains as basis risk the ETF cannot track. We size for that honestly rather than assuming a perfect hedge.</p>

<h2>Scenario analysis — hedged vs unhedged</h2>
<table><thead><tr><th>ETF move</th><th>Fuel move</th><th>Unhedged cost</th><th>Hedged cost</th><th>Savings</th></tr></thead><tbody>${scenarioRows}</tbody></table>
${breakeven}

<h2>Options overlay choices</h2>
<table><thead><tr><th>Strategy</th><th>Net premium</th><th>Max loss</th><th>Breakeven ETF</th><th>Best for</th></tr></thead><tbody>${optionRows}</tbody></table>
<p class="note">All option strategies use listed ETF options under Series 65/66 advisory scope. The client executes through their own brokerage; the adviser collects no commission on the trades.</p>

<h2>Implementation</h2>
<ol>
  <li>Open a standard brokerage account (Schwab, Fidelity, or Interactive Brokers) in the company name.</li>
  <li>Buy ${a.hedgeSize.sharesNeeded.toLocaleString()} shares of ${esc(a.market.etfTicker)} (~${money(a.hedgeSize.etfNotional)}) to establish the ${pct(a.coverageRatio, 0)} foundation hedge.</li>
  <li>Optionally add an options overlay (above) for capped-cost protection — requires Level 2/3 options approval.</li>
  <li>Rebalance the ETF position quarterly if it drifts more than 10%; roll any options ~30 days before expiry.</li>
  <li>Review coverage with your advisor as consumption, prices, or volatility change.</li>
</ol>

<div class="disc"><h3>Important disclosures</h3><ul>${disclaimers}</ul></div>
<div class="foot">${esc(a.company.name)} &middot; ${provLabel} &middot; Prepared ${todayLong()} by ${esc(b.firmName)} &middot; For client review under Series 65/66 advisory scope.</div>

<script>window.addEventListener('load',()=>{setTimeout(()=>{try{window.print()}catch(e){}},500);});</script>
</body></html>`;
}
