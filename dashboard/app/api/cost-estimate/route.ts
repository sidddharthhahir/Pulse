import { NextResponse } from "next/server";
import { listRuns } from "@/lib/runs";
import { getAverageCostPerTopic } from "@/lib/usage";

// Fallback for brand-new installs with no run-usage history yet — roughly
// what a topic costs post-caching-fix (deep-research + hooks + write + edit).
const DEFAULT_PER_TOPIC_USD = 0.15;

export async function GET() {
  try {
    const runs = await listRuns();
    const recent = runs
      .filter((r) => r.status === "completed")
      .slice(0, 10)
      .map((r) => ({ id: r.id, topicCount: r.selected_topics.length }));
    const avg = await getAverageCostPerTopic(recent);
    return NextResponse.json({ per_topic_usd: avg ?? DEFAULT_PER_TOPIC_USD, from_history: avg != null });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
