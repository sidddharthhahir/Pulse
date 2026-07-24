import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { REPO_ROOT, KB_DIR, PIPELINE_STATE_DIR } from "@/lib/paths";

const execFileAsync = promisify(execFile);

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Zips everything that makes Pulse *yours* — voice, rules, run history,
// schedule — so there's a real backup beyond "hope the disk never dies".
// Shells out to the system `zip` binary (execFile, array args — no shell
// string ever gets built, so there's nothing to inject).
export async function GET() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pulse-export-"));
  const filename = `pulse-backup-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString("hex")}.zip`;
  const zipPath = path.join(tmpDir, filename);

  try {
    const targets: string[] = [];
    if (await exists(KB_DIR)) targets.push("knowledge_base");
    if (await exists(PIPELINE_STATE_DIR)) targets.push("pipeline_state");
    if (targets.length === 0) {
      return NextResponse.json({ error: "Nothing to back up yet — no knowledge base or run history found." }, { status: 404 });
    }

    await execFileAsync("zip", ["-r", "-q", zipPath, ...targets], { cwd: REPO_ROOT });
    const data = await fs.readFile(zipPath);

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
