import Anthropic from "@anthropic-ai/sdk";

// Check multiple possible env var names for the Anthropic API key
export function getAnthropicApiKey(): string | null {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.CLAUDE_KEY ||
    null
  );
}

export function createAnthropicClient(): Anthropic | null {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// Use claude-sonnet-4-20250514 as the stable model ID
export const AI_MODEL = "claude-sonnet-4-20250514";
