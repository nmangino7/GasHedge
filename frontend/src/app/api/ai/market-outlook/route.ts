export const maxDuration = 30;

import { legacyAdvisorJson } from "@/ai/legacy-response";

const QUESTION = `Give a brief (2-3 paragraph) fuel market outlook for small businesses considering hedging. Use your tools to pull the current national gasoline and diesel prices and the recommended ETF quote, then cover: (1) the current price environment, (2) recent trend, and (3) what it means for hedging posture right now.`;

export async function GET() {
  return legacyAdvisorJson({ task: "market_outlook", question: QUESTION });
}
