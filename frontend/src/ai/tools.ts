import type Anthropic from "@anthropic-ai/sdk";

// Tool definitions exposed to the model. Input schemas are intentionally small
// and explicit; runtime validation happens in tool-runner.ts (Zod).

const companyIdProp = {
  companyId: { type: "number", description: "The client company's numeric id." },
} as const;

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "get_company_profile",
    description:
      "Look up a client company's profile: name, type, fleet size, fuel type, PADD region, monthly gallons, and annual revenue.",
    input_schema: {
      type: "object",
      properties: { ...companyIdProp },
      required: ["companyId"],
    },
  },
  {
    name: "get_market_data",
    description:
      "Get the live market inputs used to size a hedge for a company: current retail fuel price, the recommended ETF and its price, correlation, and the fuel/ETF volatilities.",
    input_schema: {
      type: "object",
      properties: { ...companyIdProp },
      required: ["companyId"],
    },
  },
  {
    name: "compute_exposure",
    description:
      "Compute a company's monthly and annual fuel cost, fuel as a percent of revenue, and price-shock scenarios.",
    input_schema: {
      type: "object",
      properties: { ...companyIdProp },
      required: ["companyId"],
    },
  },
  {
    name: "size_hedge",
    description:
      "Size an ETF hedge using the minimum-variance hedge ratio. Returns beta, hedge effectiveness, basis risk, ETF notional, shares needed, and annual expense drag.",
    input_schema: {
      type: "object",
      properties: {
        ...companyIdProp,
        coverageRatio: {
          type: "number",
          description: "Fraction of consumption to hedge (e.g. 0.25, 0.5, 0.75).",
        },
      },
      required: ["companyId", "coverageRatio"],
    },
  },
  {
    name: "price_strategy",
    description:
      "Price one ETF option strategy for a company. Returns premium, max loss/gain, breakeven, net delta, and the legs.",
    input_schema: {
      type: "object",
      properties: {
        ...companyIdProp,
        strategyKey: {
          type: "string",
          enum: [
            "long_call",
            "long_put",
            "covered_call",
            "short_put",
            "collar",
            "bull_call_spread",
            "bear_put_spread",
            "iron_condor",
          ],
          description: "Which strategy to price.",
        },
        coverageRatio: {
          type: "number",
          description: "Fraction of consumption to hedge (default 0.5).",
        },
      },
      required: ["companyId", "strategyKey"],
    },
  },
  {
    name: "run_scenarios",
    description:
      "Run a basis-risk-aware scenario sweep of an outright ETF hedge across ETF price moves. Optionally stress with a fuel-only basis drift.",
    input_schema: {
      type: "object",
      properties: {
        ...companyIdProp,
        coverageRatio: { type: "number", description: "Fraction of consumption to hedge (default 0.5)." },
        basisDriftPct: {
          type: "number",
          description: "Optional extra fuel move not explained by the ETF, e.g. 0.05 for +5%.",
        },
      },
      required: ["companyId"],
    },
  },
];
