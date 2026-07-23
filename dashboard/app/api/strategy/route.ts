import { NextResponse } from "next/server";
import { appendStrategyLog } from "@/lib/knowledge-base";
import { RunRecord } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const run = (await req.json()) as RunRecord;
    const date = new Date(run.created_at).toISOString().slice(0, 10);

    const publishedCount = Object.values(run.decisions).filter((d) => d.decision === "approved").length;
    const dryRun = Object.values(run.publish_results).some((p) => p.dry_run);

    const entry = `## Session — ${date} (dashboard)

**Topics selected:** ${run.selected_topics.join(", ") || "none"}
**Topics discarded:** ${run.discarded_topics.join(", ") || "none"}
**Posts published:** ${publishedCount}
**Dry run:** ${dryRun ? "Yes" : "No"}

**Notes:**
- Run via Pulse Dashboard (run id: ${run.id})
`;

    await appendStrategyLog(entry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
