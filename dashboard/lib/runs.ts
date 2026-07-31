import fs from "fs/promises";
import path from "path";
import { RUNS_DIR, safeId } from "./paths";
import { RunRecord } from "./types";

async function ensureDir() {
  await fs.mkdir(RUNS_DIR, { recursive: true });
}

// Thrown by saveRun when a caller passes expectedUpdatedAt and the file on
// disk has moved on since — a read-modify-write mutation (see mutateRun on
// the client) built its patch against a copy that's no longer current.
export class RunConflictError extends Error {
  constructor() {
    super("Run was modified elsewhere — refresh and try again");
    this.name = "RunConflictError";
  }
}

// Publish results land in two places depending on how a post went out — a
// live approve click in the pipeline, or the scheduler/launchd firing later.
// Both paths funnel through here so the Drafts page's "log performance" form
// (gated on publish_results) shows up regardless of which path a post took.
export async function syncPublishResult(
  runId: string,
  topicTitle: string,
  publishResult: { dry_run: boolean; url?: string; output: string }
): Promise<void> {
  const run = await getRun(runId);
  if (!run) return;
  run.publish_results = { ...run.publish_results, [topicTitle]: publishResult };
  await saveRun(run);
}

export async function listRuns(): Promise<RunRecord[]> {
  await ensureDir();
  const files = (await fs.readdir(RUNS_DIR)).filter((f) => f.endsWith(".json"));
  const runs = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(RUNS_DIR, f), "utf-8")) as RunRecord)
  );
  return runs.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getRun(id: string): Promise<RunRecord | null> {
  await ensureDir();
  try {
    const raw = await fs.readFile(path.join(RUNS_DIR, `${safeId(id)}.json`), "utf-8");
    return JSON.parse(raw) as RunRecord;
  } catch {
    return null;
  }
}

export async function saveRun(run: RunRecord, expectedUpdatedAt?: string): Promise<void> {
  await ensureDir();
  if (expectedUpdatedAt !== undefined) {
    const current = await getRun(run.id);
    if (current && current.updated_at !== expectedUpdatedAt) {
      throw new RunConflictError();
    }
  }
  run.updated_at = new Date().toISOString();
  await fs.writeFile(path.join(RUNS_DIR, `${safeId(run.id)}.json`), JSON.stringify(run, null, 2), "utf-8");
}
