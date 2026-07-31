import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import dotenv from "dotenv";
import { getScheduled, saveScheduled } from "@/lib/scheduled";
import { syncPublishResult } from "@/lib/runs";
import { REPO_ROOT, SCRIPTS_DIR, ENV_PATH, resolvePublicAsset } from "@/lib/paths";

const execFileAsync = promisify(execFile);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { action, text, scheduled_at } = (await req.json()) as {
      action: "cancel" | "publish_now" | "edit";
      text?: string;
      scheduled_at?: string;
    };
    const post = await getScheduled(params.id);
    if (!post) return NextResponse.json({ error: "Scheduled post not found" }, { status: 404 });

    if (action === "cancel") {
      post.status = "canceled";
      await saveScheduled(post);
      return NextResponse.json({ post });
    }

    if (action === "edit") {
      if (post.status !== "pending") {
        return NextResponse.json({ error: "Only a queued post can be edited" }, { status: 400 });
      }
      if (text !== undefined) {
        if (!text.trim()) return NextResponse.json({ error: "Post text can't be empty" }, { status: 400 });
        post.text = text;
      }
      if (scheduled_at !== undefined) {
        if (Number.isNaN(Date.parse(scheduled_at))) {
          return NextResponse.json({ error: "Invalid scheduled_at" }, { status: 400 });
        }
        post.scheduled_at = scheduled_at;
      }
      await saveScheduled(post);
      return NextResponse.json({ post });
    }

    if (action === "publish_now") {
      dotenv.config({ path: ENV_PATH });
      const hasLinkedInToken = Boolean(process.env.LINKEDIN_ACCESS_TOKEN);

      const scriptPath = path.join(SCRIPTS_DIR, "publish_post.py");
      const args = ["python3", scriptPath, "--topic", post.topic_title, "--text", post.text];
      if (post.article_url) {
        args.push("--article-url", post.article_url);
      } else if (post.image_path) {
        args.push("--image", resolvePublicAsset(post.image_path));
      }
      if (!hasLinkedInToken) args.push("--dry-run");

      try {
        const { stdout, stderr } = await execFileAsync(args[0], args.slice(1), { cwd: REPO_ROOT });
        const output = stdout + (stderr ? `\n${stderr}` : "");
        const urlMatch = output.match(/RESULT linkedin_url:\s*(\S+)/);
        post.status = "published";
        post.publish_result = { dry_run: !hasLinkedInToken, url: urlMatch ? urlMatch[1] : undefined, output };
        await syncPublishResult(post.run_id, post.topic_title, post.publish_result);
      } catch (err) {
        post.status = "failed";
        post.error = (err as Error).message;
      }
      await saveScheduled(post);
      return NextResponse.json({ post });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
