import fs from "fs/promises";
import path from "path";
import { RUNS_DIR, safeId } from "./paths";
import { RunRecord } from "./types";

async function ensureDir() {
  await fs.mkdir(RUNS_DIR, { recursive: true });
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

export async function saveRun(run: RunRecord): Promise<void> {
  await ensureDir();
  run.updated_at = new Date().toISOString();
  await fs.writeFile(path.join(RUNS_DIR, `${safeId(run.id)}.json`), JSON.stringify(run, null, 2), "utf-8");
}
