import { NextResponse } from "next/server";
import { listRuns, saveRun, RunConflictError } from "@/lib/runs";
import { RunRecord } from "@/lib/types";

export async function GET() {
  try {
    const runs = await listRuns();
    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // expected_updated_at is optional — callers doing a plain "save my whole
    // in-memory copy" (the pipeline page's autosave) can omit it and keep
    // last-write-wins semantics. Callers doing read-then-mutate-then-write
    // against a possibly-stale copy (SkippedDraftCard) should pass it.
    const { expected_updated_at, ...run } = (await req.json()) as RunRecord & { expected_updated_at?: string };
    await saveRun(run, expected_updated_at);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RunConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
