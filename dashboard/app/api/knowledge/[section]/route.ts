import { NextResponse } from "next/server";
import { readKb, writeKb } from "@/lib/knowledge-base";
import { KbSection } from "@/lib/paths";

const VALID: KbSection[] = [
  "profile",
  "content_rules",
  "writing_samples",
  "high_performing_posts",
  "strategy_log",
];

export async function GET(_req: Request, { params }: { params: { section: string } }) {
  const section = params.section as KbSection;
  if (!VALID.includes(section)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  }
  const content = await readKb(section);
  return NextResponse.json({ content });
}

export async function PUT(req: Request, { params }: { params: { section: string } }) {
  const section = params.section as KbSection;
  if (!VALID.includes(section)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  }
  try {
    const { content } = (await req.json()) as { content: string };
    await writeKb(section, content);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
