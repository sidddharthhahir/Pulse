import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { ENV_PATH } from "./paths";
import { recordUsage, recordRunUsage } from "./usage";

dotenv.config({ path: ENV_PATH });

export const MODEL = "claude-sonnet-5";

// Sonnet 5 runs adaptive thinking by default when `thinking` is omitted — a
// silent behavior change from 4.6, where omitting it meant thinking-off. That
// default was quietly billing every JSON-extraction call (research, rank,
// hooks, etc.) for hidden reasoning tokens it never needed. Stages that only
// need to follow a fixed instruction and emit JSON should disable it explicitly.
export const THINKING_DISABLED = { type: "disabled" as const };

// Marks a content block as the stable, KB-derived prefix shared across the
// several calls a single pipeline run makes for a stage (e.g. one write call
// per topic). Cache reuse requires the cached prefix to be byte-identical
// across calls, so static instructions/KB text must live in their own block,
// separate from per-call dynamic content — mixing them into one string (as
// the old top-level `cache_control` shorthand did) means the "cached" block
// is never actually repeated, so it's a pure write cost with no read benefit.
export function staticBlock(text: string) {
  return { type: "text" as const, text, cache_control: { type: "ephemeral" as const } };
}

export function dynamicBlock(text: string) {
  return { type: "text" as const, text };
}

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to the repo-root .env file (see .env.example)."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// All pipeline routes go through this instead of calling the SDK directly, so
// token usage from every response accumulates into pipeline_state/usage.json
// (feeds the dashboard's "est. API spend" tile). Recording is best-effort —
// a failed write never fails the actual request. Pass runId to also tag the
// usage against that specific pipeline run (feeds per-run cost display).
export async function createTracked(
  params: Anthropic.MessageCreateParamsNonStreaming,
  runId?: string
): Promise<Anthropic.Message> {
  const message = await getClaude().messages.create(params);
  recordUsage(message.usage).catch(() => {});
  if (runId) recordRunUsage(runId, message.usage).catch(() => {});
  return message;
}

// max_uses hard-caps how many searches Claude can run in a single call. Without
// it, an open-ended "search the web and find topics" prompt can spiral into
// dozens of searches and a context that balloons with every result — that's
// what drove a single research call to 56 searches / ~450K input tokens.
export function webSearchTool(maxUses: number) {
  return {
    type: "web_search_20260209" as const,
    name: "web_search" as const,
    max_uses: maxUses,
  };
}

// Every stage asks Claude to answer with ONLY a JSON object/array. This pulls
// the last top-level JSON blob out of the response text, tolerating any
// surrounding prose or a ```json fence the model adds despite instructions.
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) {
    throw new Error(`No JSON found in model response: ${text.slice(0, 200)}`);
  }
  const trimmed = candidate.slice(start);
  // Find the matching close by scanning from the end for the last } or ]
  const lastBrace = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  const jsonStr = trimmed.slice(0, lastBrace + 1);
  return JSON.parse(jsonStr) as T;
}

export function textFromMessage(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
