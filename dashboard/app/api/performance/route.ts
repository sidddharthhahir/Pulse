import { NextResponse } from "next/server";
import { getRun, saveRun } from "@/lib/runs";
import { PostPerformance } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { run_id, topic_title, impressions, reactions, comments } = (await req.json()) as {
      run_id: string;
      topic_title: string;
      impressions?: number;
      reactions?: number;
      comments?: number;
    };

    const run = await getRun(run_id);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    const performance: PostPerformance = {
      impressions,
      reactions,
      comments,
      recorded_at: new Date().toISOString(),
    };
    run.performance = { ...(run.performance ?? {}), [topic_title]: performance };
    await saveRun(run);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
