import { NextResponse } from "next/server";
import { appendWritingSample } from "@/lib/knowledge-base";

export async function POST(req: Request) {
  try {
    const { text, performance_note, why_note } = (await req.json()) as {
      text: string;
      performance_note?: string;
      why_note?: string;
    };
    await appendWritingSample(text, performance_note || "Not tracked", why_note || "Added from Drafts");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
