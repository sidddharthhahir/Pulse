import { listRuns } from "./runs";
import { HookOption, RunRecord } from "./types";

interface ScoredPost {
  hookType: HookOption["type"] | "Unknown";
  pillar: string;
  format: string;
  hasImage: boolean;
  impressions: number;
  reactions: number;
}

function collectScoredPosts(runs: RunRecord[]): ScoredPost[] {
  const out: ScoredPost[] = [];
  for (const run of runs) {
    for (const [topicTitle, perf] of Object.entries(run.performance ?? {})) {
      if (perf.impressions == null && perf.reactions == null) continue;
      const topic = run.ranked_topics.find((t) => t.title === topicTitle);
      const draft = run.drafts.find((d) => d.topic_title === topicTitle);
      const chosenHookText = run.selected_hooks[topicTitle];
      const hookSet = run.hooks.find((h) => h.topic_title === topicTitle);
      const hookType = hookSet?.hooks.find((h) => h.text === chosenHookText)?.type ?? "Unknown";
      out.push({
        hookType,
        pillar: topic?.pillar ?? "Unknown",
        format: topic?.format ?? "standard",
        hasImage: Boolean(draft?.image_path),
        impressions: perf.impressions ?? 0,
        reactions: perf.reactions ?? 0,
      });
    }
  }
  return out;
}

function avgBy<T extends string>(
  posts: ScoredPost[],
  key: (p: ScoredPost) => T
): Record<T, { avgReactions: number; avgImpressions: number; count: number }> {
  const groups: Record<string, ScoredPost[]> = {};
  for (const p of posts) {
    const k = key(p);
    (groups[k] ??= []).push(p);
  }
  const result = {} as Record<T, { avgReactions: number; avgImpressions: number; count: number }>;
  for (const [k, group] of Object.entries(groups)) {
    result[k as T] = {
      avgReactions: group.reduce((a, b) => a + b.reactions, 0) / group.length,
      avgImpressions: group.reduce((a, b) => a + b.impressions, 0) / group.length,
      count: group.length,
    };
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
  const byImage = avgBy(posts, (p) => (p.hasImage ? "With image" : "Text only"));

  const fmtReactions = (entries: [string, { avgReactions: number; count: number }][]) =>
    entries
      .sort((a, b) => b[1].avgReactions - a[1].avgReactions)
      .map(([k, s]) => `- ${k}: avg ${s.avgReactions.toFixed(0)} reactions (${s.count} post${s.count === 1 ? "" : "s"})`)
      .join("\n");

  const fmtImpressions = (entries: [string, { avgImpressions: number; count: number }][]) =>
    entries
      .sort((a, b) => b[1].avgImpressions - a[1].avgImpressions)
      .map(([k, s]) => `- ${k}: avg ${s.avgImpressions.toFixed(0)} impressions (${s.count} post${s.count === 1 ? "" : "s"})`)
      .join("\n");

  return `Based on ${posts.length} of the user's past posts with recorded performance:

By hook type:
${fmtReactions(Object.entries(byHook))}

By pillar:
${fmtReactions(Object.entries(byPillar))}

By image attached:
${fmtImpressions(Object.entries(byImage))}

Favor what's worked when it fits the topic naturally — but don't force a hook type, pillar, or image where it doesn't suit the material.`;
}

// Whether attaching an image looks worth nudging for — real signal once
// enough is tracked, otherwise falls back to general best-practice framing
// rather than pretending there's no data at all.
export async function getImageNudge(): Promise<{ shouldNudge: boolean; basedOnData: boolean; count: number }> {
  const runs = await listRuns();
  const posts = collectScoredPosts(runs);
  const withImage = posts.filter((p) => p.hasImage);
  const withoutImage = posts.filter((p) => !p.hasImage);
  if (withImage.length >= 2 && withoutImage.length >= 2) {
    const avgWith = withImage.reduce((a, b) => a + b.impressions, 0) / withImage.length;
    const avgWithout = withoutImage.reduce((a, b) => a + b.impressions, 0) / withoutImage.length;
    return { shouldNudge: avgWith > avgWithout, basedOnData: true, count: posts.length };
  }
  return { shouldNudge: true, basedOnData: false, count: posts.length };
}

export interface PostingTimeSignal {
  active: boolean;
  count: number;
  best?: { dayOfWeek: string; hour: string; impressions: number };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

// Early signal, not a statistical model — with only a handful of logged
// posts, this surfaces the single best-performing publish time rather than
// manufacturing false precision from averaged hourly buckets.
export async function getBestPostingTime(): Promise<PostingTimeSignal> {
  const runs = await listRuns();
  const points: { ts: number; impressions: number }[] = [];
  for (const run of runs) {
    const hasRealPublish = Object.values(run.publish_results).some((p) => !p.dry_run);
    if (!hasRealPublish) continue;
    for (const perf of Object.values(run.performance ?? {})) {
      if (perf.impressions == null) continue;
      points.push({ ts: new Date(run.updated_at).getTime(), impressions: perf.impressions });
    }
  }
  if (points.length < MIN_SAMPLE) return { active: false, count: points.length };

  const top = points.reduce((a, b) => (b.impressions > a.impressions ? b : a));
  const d = new Date(top.ts);
  return {
    active: true,
    count: points.length,
    best: { dayOfWeek: DAY_NAMES[d.getDay()], hour: formatHour(d.getHours()), impressions: top.impressions },
  };
}
