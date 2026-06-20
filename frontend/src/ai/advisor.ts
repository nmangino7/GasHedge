import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "./client";
import { systemPromptFor } from "./prompts";
import { TASK_MODEL, TASK_MAX_TOKENS, AdvisorTask } from "./models";
import { TOOL_DEFS } from "./tools";
import { runTool, ToolError } from "./tool-runner";
import { DISCLAIMERS } from "@/domain/reference/disclaimers";

export interface AdvisorRequest {
  task: AdvisorTask;
  question: string;
  companyId?: number;
  /** Prior turns for a chat, in Anthropic message format. */
  history?: Anthropic.MessageParam[];
}

export interface ToolCallTrace {
  name: string;
  input: unknown;
  ok: boolean;
}

export interface AdvisorResult {
  text: string;
  toolCalls: ToolCallTrace[];
  disclaimers: string[];
}

export class AiNotConfiguredError extends Error {}

const MAX_TURNS = 6;

/** Run the tool-use loop until the model produces a final text answer. */
export async function runAdvisor(req: AdvisorRequest): Promise<AdvisorResult> {
  const client = createAnthropicClient();
  if (!client) throw new AiNotConfiguredError("Anthropic API key not configured.");

  const hint = req.companyId ? `\n\n(The client company id is ${req.companyId}.)` : "";
  const messages: Anthropic.MessageParam[] = [
    ...(req.history ?? []),
    { role: "user", content: req.question + hint },
  ];

  const toolCalls: ToolCallTrace[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: TASK_MODEL[req.task],
      max_tokens: TASK_MAX_TOKENS[req.task],
      system: systemPromptFor(req.task),
      tools: TOOL_DEFS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return { text: extractText(response.content), toolCalls, disclaimers: DISCLAIMERS };
    }

    // Execute every tool the model asked for and feed results back.
    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      let resultContent: string;
      let ok = true;
      try {
        const out = await runTool(block.name, block.input);
        resultContent = JSON.stringify(out);
      } catch (e) {
        ok = false;
        resultContent = `ERROR: ${e instanceof ToolError ? e.message : "tool failed"}`;
      }
      toolCalls.push({ name: block.name, input: block.input, ok });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: resultContent,
        is_error: !ok,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  // Ran out of turns — make one final, tool-free pass for a best-effort answer.
  const final = await client.messages.create({
    model: TASK_MODEL[req.task],
    max_tokens: TASK_MAX_TOKENS[req.task],
    system: systemPromptFor(req.task),
    messages,
  });
  return { text: extractText(final.content), toolCalls, disclaimers: DISCLAIMERS };
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
