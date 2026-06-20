// State → PADD (Petroleum Administration for Defense District) region mapping.
// Codes match the EIA "duoarea" facets used by the price service.
// Static reference data.

export type PaddRegion = "R10" | "R20" | "R30" | "R40" | "R50" | "NUS";

export const PADD_LABELS: Record<PaddRegion, string> = {
  R10: "East Coast (PADD 1)",
  R20: "Midwest (PADD 2)",
  R30: "Gulf Coast (PADD 3)",
  R40: "Rocky Mountain (PADD 4)",
  R50: "West Coast (PADD 5)",
  NUS: "U.S. Average",
};

const STATE_TO_PADD: Record<string, PaddRegion> = {
  // PADD 1 — East Coast
  CT: "R10", DE: "R10", DC: "R10", FL: "R10", GA: "R10", ME: "R10", MD: "R10",
  MA: "R10", NH: "R10", NJ: "R10", NY: "R10", NC: "R10", PA: "R10", RI: "R10",
  SC: "R10", VT: "R10", VA: "R10", WV: "R10",
  // PADD 2 — Midwest
  IL: "R20", IN: "R20", IA: "R20", KS: "R20", KY: "R20", MI: "R20", MN: "R20",
  MO: "R20", NE: "R20", ND: "R20", OH: "R20", OK: "R20", SD: "R20", TN: "R20",
  WI: "R20",
  // PADD 3 — Gulf Coast
  AL: "R30", AR: "R30", LA: "R30", MS: "R30", NM: "R30", TX: "R30",
  // PADD 4 — Rocky Mountain
  CO: "R40", ID: "R40", MT: "R40", UT: "R40", WY: "R40",
  // PADD 5 — West Coast
  AK: "R50", AZ: "R50", CA: "R50", HI: "R50", NV: "R50", OR: "R50", WA: "R50",
};

/** Map a 2-letter US state code to its PADD region, defaulting to U.S. average. */
export function paddForState(state: string): PaddRegion {
  return STATE_TO_PADD[state.toUpperCase()] ?? "NUS";
}

export function paddLabel(region: string): string {
  return PADD_LABELS[region as PaddRegion] ?? region;
}
