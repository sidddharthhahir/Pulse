import fs from "fs/promises";
import { KB_FILES, KbSection } from "./paths";

export async function readKb(section: KbSection): Promise<string> {
  return fs.readFile(KB_FILES[section], "utf-8");
}

export async function writeKb(section: KbSection, content: string): Promise<void> {
  if (section === "strategy_log") {
    throw new Error("strategy_log.md is append-only via the strategy API, not directly editable");
  }
  await fs.writeFile(KB_FILES[section], content, "utf-8");
}

export async function appendStrategyLog(entry: string): Promise<void> {
  await fs.appendFile(KB_FILES.strategy_log, `\n${entry}\n`, "utf-8");
}

export async function appendWritingSample(text: string, performanceNote: string, whyNote: string): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n---\n\n## Sample — ${date}\n**Performance:** ${performanceNote}\n**Why it works:** ${whyNote}\n\n${text}\n`;
  await fs.appendFile(KB_FILES.writing_samples, entry, "utf-8");
}

// Trimmed profile for research/ranking stages: identity, audience, goal, and
// pillars only. Drops Publishing/Notion config (irrelevant to topic discovery)
// and keeps prompts lean — profile.md is re-sent on every call, so every
// section here is paid for repeatedly.
export async function readProfileCore(includeStories = false): Promise<string> {
  const full = await readKb("profile");
  const keep = ["## Identity", "## What you do", "## Audience", "## Goal on LinkedIn", "## Content Pillars"];
  if (includeStories) keep.push("## Story Bank");
  const sections = full.split(/(?=^## )/m);
  return sections
    .filter((s) => keep.some((k) => s.startsWith(k)))
    .join("")
    .trim();
}

// Pulls the pillar names out of "## Content Pillars" (a numbered list, one
// optionally **bolded** with a parenthetical/description after an em dash).
// Used to show pillar balance on the dashboard — including pillars posted
// zero times this month, which a simple count-what-exists tally would miss.
export function parsePillars(profile: string): string[] {
  const section = profile.match(/## Content Pillars\s*\n([\s\S]*?)(?:\n##|\n>|$)/);
  if (!section) return [];
  return section[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\./.test(l))
    .map((l) =>
      l
        .replace(/^\d+\.\s*/, "")
        .replace(/\*\*/g, "")
        .split("—")[0]
        .split("(")[0]
        .trim()
    )
    .filter(Boolean);
}

export async function readAllKb() {
  const [profile, content_rules, writing_samples, high_performing_posts] = await Promise.all([
    readKb("profile"),
    readKb("content_rules"),
    readKb("writing_samples"),
    readKb("high_performing_posts"),
  ]);
  return { profile, content_rules, writing_samples, high_performing_posts };
}
