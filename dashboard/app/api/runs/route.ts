import { NextResponse } from "next/server";
import { listRuns, saveRun } from "@/lib/runs";
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
    const run = (await req.json()) as RunRecord;
    await saveRun(run);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
