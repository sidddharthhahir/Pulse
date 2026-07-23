import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { REPO_ROOT, SCRIPTS_DIR, ENV_PATH, resolvePublicAsset } from "@/lib/paths";
import dotenv from "dotenv";

const execFileAsync = promisify(execFile);

export async function POST(req: Request) {
  try {
    const { topic, text, image_path, article_url } = (await req.json()) as {
      topic: string;
      text: string;
      image_path?: string;
      article_url?: string;
    };

    dotenv.config({ path: ENV_PATH });
    const hasLinkedInToken = Boolean(process.env.LINKEDIN_ACCESS_TOKEN);

    const scriptPath = path.join(SCRIPTS_DIR, "publish_post.py");
    const args = ["python3", scriptPath, "--topic", topic, "--text", text];
    if (article_url) {
      args.push("--article-url", article_url);
    } else if (image_path) {
      // resolvePublicAsset rejects anything that would escape public/ (e.g. "../../.env")
      args.push("--image", resolvePublicAsset(image_path));
    }
    if (!hasLinkedInToken) args.push("--dry-run");

    const { stdout, stderr } = await execFileAsync(args[0], args.slice(1), {
      cwd: REPO_ROOT,
    });

    const output = stdout + (stderr ? `\n${stderr}` : "");
    const urlMatch = output.match(/RESULT linkedin_url:\s*(\S+)/);

    return NextResponse.json({
      dry_run: !hasLinkedInToken,
      url: urlMatch ? urlMatch[1] : undefined,
      output,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
