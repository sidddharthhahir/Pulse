import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { REPO_ROOT, SCRIPTS_DIR, LINKEDIN_ANALYTICS_STATUS_PATH } from "@/lib/paths";

const execFileAsync = promisify(execFile);

interface AnalyticsSyncStatus {
  granted: boolean;
  detail: string;
  checked_at: string;
}

async function readStatus(): Promise<AnalyticsSyncStatus | null> {
  try {
    return JSON.parse(await fs.readFile(LINKEDIN_ANALYTICS_STATUS_PATH, "utf-8"));
  } catch {
    return null; // sync_performance.py has never run yet
  }
}

export async function GET() {
  try {
    const status = await readStatus();
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Triggers scripts/sync_performance.py immediately instead of waiting for
// the next launchd interval — same pattern as "Publish now" for scheduled
// posts. Returns the script's own stdout so the UI can show what it found.
export async function POST() {
  try {
    const scriptPath = path.join(SCRIPTS_DIR, "sync_performance.py");
    const { stdout, stderr } = await execFileAsync("python3", [scriptPath], { cwd: REPO_ROOT, timeout: 60_000 });
    const status = await readStatus();
    return NextResponse.json({ status, output: stdout + (stderr ? `\n${stderr}` : "") });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
