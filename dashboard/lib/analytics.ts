import { listRuns } from "./runs";
import { HookOption, RunRecord } from "./types";

interface ScoredPost {
  hookType: HookOption["type"] | "Unknown";
  pillar: string;
  format: string;
  impressions: number;
  reactions: number;
}

function collectScoredPosts(runs: RunRecord[]): ScoredPost[] {
  const out: ScoredPost[] = [];
  for (const run of runs) {
    for (const [topicTitle, perf] of Object.entries(run.performance ?? {})) {
      if (perf.impressions == null && perf.reactions == null) continue;
      const topic = run.ranked_topics.find((t) => t.title === topicTitle);
      const chosenHookText = run.selected_hooks[topicTitle];
      const hookSet = run.hooks.find((h) => h.topic_title === topicTitle);
      const hookType = hookSet?.hooks.find((h) => h.text === chosenHookText)?.type ?? "Unknown";
      out.push({
        hookType,
        pillar: topic?.pillar ?? "Unknown",
        format: topic?.format ?? "standard",
        impressions: perf.impressions ?? 0,
        reactions: perf.reactions ?? 0,
      });
    }
  }
  return out;
}

function avgBy<T extends string>(posts: ScoredPost[], key: (p: ScoredPost) => T): Record<T, { avgReactions: number; count: number }> {
  const groups: Record<string, number[]> = {};
  for (const p of posts) {
    const k = key(p);
    (groups[k] ??= []).push(p.reactions);
  }
  const result = {} as Record<T, { avgReactions: number; count: number }>;
  for (const [k, vals] of Object.entries(groups)) {
    result[k as T] = { avgReactions: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length };
  }
  return result;
}

const MIN_SAMPLE = 3;

export interface PerformanceStatus {
  count: number;
  threshold: number;
  active: boolean;
}

// How close the analytics feedback loop is to switching on — it's invisible
// otherwise, since getPerformanceInsights() just silently returns null below
// the threshold with no indication anywhere that it's waiting on more data.
export async function getPerformanceStatus(): Promise<PerformanceStatus> {
  const runs = await listRuns();
  const count = collectScoredPosts(runs).length;
  return { count, threshold: MIN_SAMPLE, active: count >= MIN_SAMPLE };
}

// Returns a short prompt-ready summary of what's performed well so far, or
// null if there isn't enough recorded data yet to say anything meaningful.
export async function getPerformanceInsights(): Promise<string | null> {
  const runs = await listRuns();
  const posts = collectScoredPosts(runs);
  if (posts.length < MIN_SAMPLE) return null;

  const byHook = avgBy(posts, (p) => p.hookType);
  const byPillar = avgBy(posts, (p) => p.pillar);

  const hookLines = Object.entries(byHook)
    .sort((a, b) => b[1].avgReactions - a[1].avgReactions)
    .map(([type, s]) => `- ${type}: avg ${s.avgReactions.toFixed(0)} reactions (${s.count} post${s.count === 1 ? "" : "s"})`)
    .join("\n");

  const pillarLines = Object.entries(byPillar)
    .sort((a, b) => b[1].avgReactions - a[1].avgReactions)
    .map(([pillar, s]) => `- ${pillar}: avg ${s.avgReactions.toFixed(0)} reactions (${s.count} post${s.count === 1 ? "" : "s"})`)
    .join("\n");

  return `Based on ${posts.length} of the user's past posts with recorded performance:

By hook type:
${hookLines}

By pillar:
${pillarLines}

Favor what's worked when it fits the topic naturally — but don't force a hook type or pillar that doesn't suit the material.`;
}
