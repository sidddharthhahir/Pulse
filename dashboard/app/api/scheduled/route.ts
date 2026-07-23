import { NextResponse } from "next/server";
import { listScheduled, saveScheduled } from "@/lib/scheduled";
import { ScheduledPost } from "@/lib/types";

export async function GET() {
  try {
    const posts = await listScheduled();
    return NextResponse.json({ posts });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      run_id: string;
      topic_title: string;
      pillar: string;
      text: string;
      image_path?: string;
      article_url?: string;
      scheduled_at: string;
    };

    // image_path must be a same-origin web path (e.g. "/visuals/foo.png") — it
    // later gets resolved to a filesystem path and read, so reject anything
    // that isn't a plain root-relative path before it's ever stored.
    if (body.image_path && !/^\/[a-zA-Z0-9/_.-]+$/.test(body.image_path)) {
      return NextResponse.json({ error: "Invalid image_path" }, { status: 400 });
    }
    if (!body.run_id || !body.topic_title || !body.text || !body.scheduled_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const post: ScheduledPost = {
      id: `sched_${Date.now()}`,
      run_id: body.run_id,
      topic_title: body.topic_title,
      pillar: body.pillar,
      text: body.text,
      image_path: body.image_path,
      article_url: body.article_url,
      scheduled_at: body.scheduled_at,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    await saveScheduled(post);

    return NextResponse.json({ post });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
