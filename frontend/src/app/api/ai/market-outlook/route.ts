import { DISCLAIMERS } from "@/lib/store";
import {
  getCurrentPrice,
  getPriceHistory,
  calculateVolatility,
} from "@/lib/eia-service";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a fuel cost management advisor for small businesses.
You provide recommendations using securities-based products (ETFs like UGA, USO, BNO, UNL).
Focus on business impact and explain concepts simply for business owners.`;

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({
      response: "Claude API key not configured.",
      disclaimers: DISCLAIMERS,
    });
  }

  const gasPrice = (await getCurrentPrice("gasoline", "NUS")) || 3.5;
  const dieselPrice = (await getCurrentPrice("diesel", "NUS")) || 3.9;

  const gasHistory = await getPriceHistory("gasoline", "NUS", 1);
  const dieselHistory = await getPriceHistory("diesel", "NUS", 1);

  const gasVol = calculateVolatility(gasHistory);
  const dieselVol = calculateVolatility(dieselHistory);

  const priceData = {
    gasoline: { current: gasPrice, trend: gasVol.trend },
    diesel: { current: dieselPrice, trend: dieselVol.trend },
  };

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Based on the following fuel price data, provide a brief market outlook:

CURRENT PRICES: ${JSON.stringify(priceData, null, 2)}
VOLATILITY: ${JSON.stringify({ gasoline: gasVol, diesel: dieselVol }, null, 2)}

Please provide a 2-3 paragraph market outlook covering:
1. Current price environment
2. Recent trends
3. What this means for small businesses considering fuel hedging`,
        },
      ],
    });
    return Response.json({
      response:
        message.content[0].type === "text" ? message.content[0].text : "",
      disclaimers: DISCLAIMERS,
    });
  } catch (e) {
    return Response.json({
      response: `Unable to generate outlook: ${e instanceof Error ? e.message : String(e)}`,
      disclaimers: DISCLAIMERS,
    });
  }
}
