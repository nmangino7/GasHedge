import Anthropic from "@anthropic-ai/sdk";

/** Resolve the Anthropic API key from any of the accepted env var names. */
export function getAnthropicApiKey(): string | null {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.CLAUDE_KEY ||
    null
  );
}

/** Create an Anthropic client, or null if no key is configured. */
export function createAnthropicClient(): Anthropic | null {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}
