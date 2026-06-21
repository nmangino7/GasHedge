// Client-ready PowerPoint deck generator. Takes a CompanyAnalysis (corrected
// engine numbers + provenance) and renders a branded .pptx the advisor can hand
// to a client. Server-side only (Node runtime).

import PptxGenJS from "pptxgenjs";
import type { CompanyAnalysis } from "@/services/company-analysis";
import { DISCLAIMERS } from "@/domain/reference/disclaimers";
import { money, pct, pctValue, signedMoney, todayLong } from "./format";

export interface DeckBranding {
  firmName: string;
  advisorName?: string;
  tagline?: string;
}

// Brand palette (dark, premium).
const C = {
  bg: "0B1220",
  panel: "131C2E",
  ink: "F8FAFC",
  sub: "94A3B8",
  accent: "38BDF8",
  good: "34D399",
  warn: "FBBF24",
  line: "1E293B",
};

const FONT = "Arial";

export async function buildDeck(
  a: CompanyAnalysis,
  branding: DeckBranding
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = branding.firmName;
  pptx.company = branding.firmName;
  pptx.title = `Fuel Hedging Plan — ${a.company.name}`;

  coverSlide(pptx, a, branding);
  exposureSlide(pptx, a, branding);
  hedgeSlide(pptx, a, branding);
  scenarioSlide(pptx, a, branding);
  optionsSlide(pptx, a, branding);
  implementationSlide(pptx, a, branding);
  disclaimerSlide(pptx, a, branding);

  // nodebuffer in the Node runtime.
  const out = (await pptx.write({ outputType: "nodebuffer" })) as unknown;
  return out as Buffer;
}

function base(pptx: PptxGenJS) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  return slide;
}

function header(slide: PptxGenJS.Slide, title: string, branding: DeckBranding) {
  slide.addText(title, {
    x: 0.6, y: 0.35, w: 9.5, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: C.ink,
  });
  slide.addText(branding.firmName, {
    x: 10.0, y: 0.4, w: 2.7, h: 0.4, fontFace: FONT, fontSize: 11, color: C.accent, align: "right", bold: true,
  });
  slide.addShape("line", { x: 0.6, y: 1.05, w: 12.1, h: 0, line: { color: C.line, width: 1 } });
}

function footer(slide: PptxGenJS.Slide, a: CompanyAnalysis) {
  const prov = a.provenance.overall;
  const provLabel = prov === "live" ? "Live market data" : prov === "cached" ? "Recent data" : "Estimated (fallback) data";
  slide.addText(
    `${a.company.name} · ${provLabel} · ${todayLong()} · For client review under Series 65/66 advisory`,
    { x: 0.6, y: 7.05, w: 12.1, h: 0.3, fontFace: FONT, fontSize: 8, color: C.sub }
  );
}

function statCard(
  slide: PptxGenJS.Slide,
  x: number,
  label: string,
  value: string,
  sub?: string,
  color = C.ink
) {
  const w = 2.85;
  slide.addShape("roundRect", { x, y: 1.5, w, h: 1.6, fill: { color: C.panel }, line: { color: C.line, width: 1 }, rectRadius: 0.08 });
  slide.addText(label.toUpperCase(), { x: x + 0.18, y: 1.65, w: w - 0.36, h: 0.3, fontFace: FONT, fontSize: 9, color: C.sub, bold: true, charSpacing: 1 });
  slide.addText(value, { x: x + 0.18, y: 2.0, w: w - 0.36, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color });
  if (sub) slide.addText(sub, { x: x + 0.18, y: 2.62, w: w - 0.36, h: 0.4, fontFace: FONT, fontSize: 9, color: C.sub });
}

function coverSlide(pptx: PptxGenJS, a: CompanyAnalysis, b: DeckBranding) {
  const slide = base(pptx);
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: C.accent } });
  slide.addText("FUEL HEDGING PLAN", { x: 0.8, y: 2.2, w: 11, h: 0.5, fontFace: FONT, fontSize: 16, color: C.accent, bold: true, charSpacing: 3 });
  slide.addText(a.company.name, { x: 0.8, y: 2.7, w: 11.7, h: 1.0, fontFace: FONT, fontSize: 44, bold: true, color: C.ink });
  slide.addText(
    `${labelCompanyType(a.company.company_type)}  ·  ${a.company.fleet_size} vehicles  ·  ${a.regionLabel}`,
    { x: 0.8, y: 3.8, w: 11.7, h: 0.5, fontFace: FONT, fontSize: 16, color: C.sub }
  );
  slide.addText(
    [
      { text: "Prepared by ", options: { color: C.sub } },
      { text: b.firmName, options: { color: C.ink, bold: true } },
      ...(b.advisorName ? [{ text: `  ·  ${b.advisorName}`, options: { color: C.sub } }] : []),
    ],
    { x: 0.8, y: 5.6, w: 11.7, h: 0.4, fontFace: FONT, fontSize: 14 }
  );
  slide.addText(todayLong(), { x: 0.8, y: 6.0, w: 11.7, h: 0.4, fontFace: FONT, fontSize: 12, color: C.sub });
  if (b.tagline) slide.addText(b.tagline, { x: 0.8, y: 6.4, w: 11.7, h: 0.4, fontFace: FONT, fontSize: 11, italic: true, color: C.accent });
}

function exposureSlide(pptx: PptxGenJS, a: CompanyAnalysis, b: DeckBranding) {
  const slide = base(pptx);
  header(slide, "Your fuel-price exposure", b);
  statCard(slide, 0.6, "Annual fuel cost", money(a.exposure.annualFuelCost), `${money(a.exposure.monthlyFuelCost)}/mo`);
  statCard(slide, 3.6, "Fuel % of revenue", a.exposure.fuelPctRevenue != null ? pctValue(a.exposure.fuelPctRevenue) : "n/a", "of annual revenue");
  statCard(slide, 6.6, "Current price", money(a.market.fuelPrice, 2) + "/gal", `${a.fuelType}`, C.accent);
  statCard(slide, 9.6, "Risk score", `${a.riskScore.overallScore}/100`, a.riskScore.riskLevel.toUpperCase(), a.riskScore.riskLevel === "high" ? C.warn : C.good);

  slide.addText("What a price spike costs you (added annual cost):", { x: 0.6, y: 3.4, w: 12, h: 0.4, fontFace: FONT, fontSize: 13, bold: true, color: C.ink });
  const rows: PptxGenJS.TableRow[] = [
    ["Price increase", "New price/gal", "Added annual fuel cost"].map((t) => cellHead(t)),
    ...a.exposure.scenarios.map((s) => [
      cell(s.label),
      cell(money(a.market.fuelPrice * (1 + s.priceChangePct), 2)),
      cell(signedMoney(s.additionalAnnualCost), C.warn),
    ]),
  ];
  slide.addTable(rows, { x: 0.6, y: 3.9, w: 8.0, colW: [2.6, 2.6, 2.8], border: { type: "solid", color: C.line, pt: 1 }, fill: { color: C.panel } });

  slide.addText(
    "Takeaway: fuel is a material, volatile cost. The next slides size a hedge that offsets most of that swing.",
    { x: 9.0, y: 3.9, w: 3.7, h: 2.5, fontFace: FONT, fontSize: 12, color: C.sub, valign: "top" }
  );
  footer(slide, a);
}

function hedgeSlide(pptx: PptxGenJS, a: CompanyAnalysis, b: DeckBranding) {
  const slide = base(pptx);
  header(slide, "Recommended ETF hedge", b);
  const h = a.hedgeSize;
  statCard(slide, 0.6, "Instrument", a.market.etfTicker, `${pct(a.coverageRatio, 0)} coverage`, C.accent);
  statCard(slide, 3.6, "Shares to hold", h.sharesNeeded.toLocaleString(), `${money(h.etfNotional)} notional`);
  statCard(slide, 6.6, "Hedge ratio (β)", a.hedgeRatio.beta.toFixed(2), "ETF $ per fuel $");
  statCard(slide, 9.6, "Annual cost", money(h.annualExpenseDrag), `${pct(a.hedgeRatio.hedgeEffectiveness, 0)} effective`, C.good);

  slide.addText("How this hedge is sized (and why it isn't perfect):", { x: 0.6, y: 3.4, w: 12, h: 0.4, fontFace: FONT, fontSize: 13, bold: true, color: C.ink });
  slide.addText(
    [
      { text: "Minimum-variance hedge ratio. ", options: { bold: true, color: C.ink } },
      { text: `We hold β = ρ·(σ_fuel/σ_etf) = ${a.hedgeRatio.beta.toFixed(2)} dollars of ${a.market.etfTicker} per dollar of fuel exposure. Because retail ${a.fuelType} is less volatile than the ETF, you hold less ETF notional than fuel notional.\n`, options: { color: C.sub } },
      { text: "Basis risk is real. ", options: { bold: true, color: C.ink } },
      { text: `This hedge removes about ${pct(a.hedgeRatio.hedgeEffectiveness, 0)} of fuel-cost variance (ρ²); roughly ${pct(a.hedgeRatio.basisRisk, 0)} remains as basis risk the ETF can't track. We size honestly for that rather than assuming a perfect hedge.`, options: { color: C.sub } },
    ],
    { x: 0.6, y: 3.9, w: 12.1, h: 2.6, fontFace: FONT, fontSize: 13, lineSpacingMultiple: 1.2, valign: "top" }
  );
  footer(slide, a);
}

function scenarioSlide(pptx: PptxGenJS, a: CompanyAnalysis, b: DeckBranding) {
  const slide = base(pptx);
  header(slide, "Scenario analysis (hedged vs unhedged)", b);
  const rows: PptxGenJS.TableRow[] = [
    ["ETF move", "Fuel move", "Unhedged cost", "Hedged cost", "Savings"].map((t) => cellHead(t)),
    ...a.scenarios.rows.map((r) => [
      cell(pctValue(r.etfChangePct * 100, 0)),
      cell(pctValue(r.fuelChangePct * 100, 0)),
      cell(money(r.unhedgedAnnualCost)),
      cell(money(r.hedgedAnnualCost)),
      cell(signedMoney(r.savings), r.savings >= 0 ? C.good : C.warn),
    ]),
  ];
  slide.addTable(rows, { x: 0.6, y: 1.4, w: 12.1, colW: [2.0, 2.0, 3.0, 3.0, 2.1], border: { type: "solid", color: C.line, pt: 1 }, fill: { color: C.panel }, fontSize: 12 });

  if (a.scenarios.breakeven) {
    slide.addText(
      `Breakeven: the hedge starts paying for its cost once ${a.market.etfTicker} rises about ${pctValue(a.scenarios.breakeven.etfChangePct * 100, 1)} (fuel ≈ ${money(a.scenarios.breakeven.fuelPrice, 2)}/gal).`,
      { x: 0.6, y: 6.2, w: 12.1, h: 0.5, fontFace: FONT, fontSize: 12, color: C.sub, italic: true }
    );
  }
  footer(slide, a);
}

function optionsSlide(pptx: PptxGenJS, a: CompanyAnalysis, b: DeckBranding) {
  const slide = base(pptx);
  header(slide, "Options overlay choices", b);
  const keys = ["long_call", "bull_call_spread", "collar"];
  const picks = keys
    .map((k) => a.strategies.find((s) => s.strategyKey === k))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const rows: PptxGenJS.TableRow[] = [
    ["Strategy", "Net premium", "Max loss", "Breakeven ETF", "Best for"].map((t) => cellHead(t)),
    ...picks.map((s) => [
      cell(s.displayName.replace(/\(.*\)/, "").trim()),
      cell(s.totalPremium >= 0 ? `${money(s.totalPremium)} debit` : `${money(-s.totalPremium)} credit`),
      cell(typeof s.maxLoss === "number" ? money(s.maxLoss) : String(s.maxLoss)),
      cell(s.breakevenEtfPrice != null ? money(s.breakevenEtfPrice, 2) : "—"),
      cell(s.bestFor, C.sub),
    ]),
  ];
  slide.addTable(rows, { x: 0.6, y: 1.4, w: 12.1, colW: [2.6, 2.2, 2.0, 2.0, 3.3], border: { type: "solid", color: C.line, pt: 1 }, fill: { color: C.panel }, fontSize: 11, valign: "middle" });
  slide.addText(
    "All option strategies use listed ETF options (Series 65/66 advisory scope). The client executes through their own brokerage; the adviser collects no commission on the trades.",
    { x: 0.6, y: 5.7, w: 12.1, h: 0.7, fontFace: FONT, fontSize: 11, color: C.sub, italic: true }
  );
  footer(slide, a);
}

function implementationSlide(pptx: PptxGenJS, a: CompanyAnalysis, b: DeckBranding) {
  const slide = base(pptx);
  header(slide, "Implementation", b);
  const steps = [
    `Open a standard brokerage account (Schwab, Fidelity, or Interactive Brokers) in the company name.`,
    `Buy ${a.hedgeSize.sharesNeeded.toLocaleString()} shares of ${a.market.etfTicker} (~${money(a.hedgeSize.etfNotional)}) to establish the ${pct(a.coverageRatio, 0)} foundation hedge.`,
    `Optionally layer an options overlay (see prior slide) for capped-cost upside protection — requires Level 2/3 options approval.`,
    `Rebalance the ETF position quarterly if it drifts more than 10%; roll options ~30 days before expiry.`,
    `Review coverage with your advisor as consumption, prices, or volatility change.`,
  ];
  slide.addText(
    steps.map((t, i) => ({ text: `${i + 1}.  ${t}`, options: { breakLine: true, paraSpaceAfter: 10 } })),
    { x: 0.6, y: 1.4, w: 12.1, h: 4.8, fontFace: FONT, fontSize: 15, color: C.ink, lineSpacingMultiple: 1.1, valign: "top" }
  );
  footer(slide, a);
}

function disclaimerSlide(pptx: PptxGenJS, a: CompanyAnalysis, b: DeckBranding) {
  const slide = base(pptx);
  header(slide, "Important disclosures", b);
  slide.addText(
    DISCLAIMERS.map((d) => ({ text: `•  ${d}`, options: { breakLine: true, paraSpaceAfter: 8 } })),
    { x: 0.6, y: 1.3, w: 12.1, h: 5.4, fontFace: FONT, fontSize: 9.5, color: C.sub, lineSpacingMultiple: 1.05, valign: "top" }
  );
  footer(slide, a);
}

// --- table cell helpers -----------------------------------------------------

function cellHead(text: string): PptxGenJS.TableCell {
  return { text, options: { bold: true, color: C.accent, fontSize: 11, fontFace: FONT, fill: { color: C.line }, valign: "middle" } };
}
function cell(text: string, color = C.ink): PptxGenJS.TableCell {
  return { text, options: { color, fontSize: 11, fontFace: FONT, valign: "middle" } };
}

function labelCompanyType(t: string): string {
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
