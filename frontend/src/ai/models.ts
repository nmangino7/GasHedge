// Centralized Claude model configuration. One place to bump model IDs.

export const MODELS = {
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;

export type AdvisorTask = "advisor_chat" | "deep_report" | "market_outlook";

/** Which model each task uses: interactive chat → Sonnet, long-form → Opus,
 *  short/frequent outlook → Haiku. */
export const TASK_MODEL: Record<AdvisorTask, string> = {
  advisor_chat: MODELS.sonnet,
  deep_report: MODELS.opus,
  market_outlook: MODELS.haiku,
};

export const TASK_MAX_TOKENS: Record<AdvisorTask, number> = {
  advisor_chat: 2000,
  deep_report: 4000,
  market_outlook: 1200,
};
