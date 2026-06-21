// Compatibility shim — the AI implementation now lives in src/ai/*.
// The legacy AI routes (ask/recommend/deep-report/market-outlook) import from
// here; this re-exports the centralized client and the latest model so they all
// use the current Claude generation rather than the pinned v1 model.

export { getAnthropicApiKey, createAnthropicClient } from "@/ai/client";
import { MODELS } from "@/ai/models";

export const AI_MODEL: string = MODELS.sonnet;
