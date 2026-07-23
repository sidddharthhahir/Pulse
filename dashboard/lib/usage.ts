import fs from "fs/promises";
import path from "path";
import { PIPELINE_STATE_DIR, RUN_USAGE_DIR, safeId } from "./paths";

// Aggregated per calendar month (YYYY-MM). Written after every Claude call so
// the dashboard can show an estimated API spend without an admin API key.
export interface MonthUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  web_search_requests: number;
  calls: number;
}

// Same shape, scoped to a single pipeline run instead of a calendar month —
// lets the UI show what one run actually cost, not just a monthly total.
export type UsageTotals = MonthUsage;

const USAGE_PATH = path.join(PIPELINE_STATE_DIR, "usage.json");

function emptyTotals(): UsageTotals {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    web_search_requests: 0,
    calls: 0,
  };
}

// Claude Sonnet 5 intro pricing (per million tokens) + web search per request.
// An estimate for the dashboard tile — the Console is the billing truth.
const PRICE = {
  input: 2.0 / 1_000_000,
  output: 10.0 / 1_000_000,
  cacheRead: 0.2 / 1_000_000,
  cacheWrite: 2.5 / 1_000_000,
  webSearch: 0.01,
};

type UsageFile = Record<string, MonthUsage>;

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

async function readUsageFile(): Promise<UsageFile> {
  try {
    return JSON.parse(await fs.readFile(USAGE_PATH, "utf-8")) as UsageFile;
  } catch {
    return {};
  }
}

export interface ApiUsageShape {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number } | null;
}

function accumulate(totals: UsageTotals, usage: ApiUsageShape): UsageTotals {
  return {
    input_tokens: totals.input_tokens + (usage.input_tokens ?? 0),
    output_tokens: totals.output_tokens + (usage.output_tokens ?? 0),
    cache_read_input_tokens: totals.cache_read_input_tokens + (usage.cache_read_input_tokens ?? 0),
    cache_creation_input_tokens: totals.cache_creation_input_tokens + (usage.cache_creation_input_tokens ?? 0),
    web_search_requests: totals.web_search_requests + (usage.server_tool_use?.web_search_requests ?? 0),
    calls: totals.calls + 1,
  };
}

export async function recordUsage(usage: ApiUsageShape): Promise<void> {
  const file = await readUsageFile();
  const key = currentMonthKey();
  file[key] = accumulate(file[key] ?? emptyTotals(), usage);
  await fs.mkdir(PIPELINE_STATE_DIR, { recursive: true });
  await fs.writeFile(USAGE_PATH, JSON.stringify(file, null, 2), "utf-8");
}

function runUsagePath(runId: string): string {
  return path.join(RUN_USAGE_DIR, `${safeId(runId)}.json`);
}

// Per-run usage, tagged by the client on every pipeline call — lets the UI
// show what one run actually cost, not just the monthly aggregate.
export async function recordRunUsage(runId: string, usage: ApiUsageShape): Promise<void> {
  await fs.mkdir(RUN_USAGE_DIR, { recursive: true });
  const filePath = runUsagePath(runId);
  let existing: UsageTotals = emptyTotals();
  try {
    existing = JSON.parse(await fs.readFile(filePath, "utf-8")) as UsageTotals;
  } catch {
    // no usage recorded for this run yet
  }
  await fs.writeFile(filePath, JSON.stringify(accumulate(existing, usage), null, 2), "utf-8");
}

export async function getRunUsage(runId: string): Promise<UsageTotals | null> {
  try {
    return JSON.parse(await fs.readFile(runUsagePath(runId), "utf-8")) as UsageTotals;
  } catch {
    return null;
  }
}

// Average total cost of the last N completed runs, divided by how many
// topics each run drafted — the basis for a pre-run cost estimate. Returns
// null if there's no usage history yet (first-ever run, or an old run from
// before per-run tracking existed).
export async function getAverageCostPerTopic(recentRuns: { id: string; topicCount: number }[]): Promise<number | null> {
  const samples: number[] = [];
  for (const run of recentRuns) {
    if (run.topicCount <= 0) continue;
    const usage = await getRunUsage(run.id);
    if (!usage || usage.calls === 0) continue;
    samples.push(estimateCostUsd(usage) / run.topicCount);
  }
  if (samples.length === 0) return null;
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

export function estimateCostUsd(m: UsageTotals): number {
  return (
    m.input_tokens * PRICE.input +
    m.output_tokens * PRICE.output +
    m.cache_read_input_tokens * PRICE.cacheRead +
    m.cache_creation_input_tokens * PRICE.cacheWrite +
    m.web_search_requests * PRICE.webSearch
  );
}

export async function getCurrentMonthUsage(): Promise<MonthUsage | null> {
  const file = await readUsageFile();
  return file[currentMonthKey()] ?? null;
}
