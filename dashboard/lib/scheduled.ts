import fs from "fs/promises";
import path from "path";
import { SCHEDULED_DIR, safeId } from "./paths";
import { ScheduledPost } from "./types";

async function ensureDir() {
  await fs.mkdir(SCHEDULED_DIR, { recursive: true });
}

export async function listScheduled(): Promise<ScheduledPost[]> {
  await ensureDir();
  const files = (await fs.readdir(SCHEDULED_DIR)).filter((f) => f.endsWith(".json"));
  const posts = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(SCHEDULED_DIR, f), "utf-8")) as ScheduledPost)
  );
  return posts.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}

export async function getScheduled(id: string): Promise<ScheduledPost | null> {
  await ensureDir();
  try {
    const raw = await fs.readFile(path.join(SCHEDULED_DIR, `${safeId(id)}.json`), "utf-8");
    return JSON.parse(raw) as ScheduledPost;
  } catch {
    return null;
  }
}

export async function saveScheduled(post: ScheduledPost): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(SCHEDULED_DIR, `${safeId(post.id)}.json`), JSON.stringify(post, null, 2), "utf-8");
}
