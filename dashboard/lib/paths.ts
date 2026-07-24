import path from "path";

// Next.js runs with cwd = dashboard/, so the repo root is one level up.
export const REPO_ROOT = path.join(process.cwd(), "..");

export const KB_DIR = path.join(REPO_ROOT, "knowledge_base");
export const PIPELINE_STATE_DIR = path.join(REPO_ROOT, "pipeline_state");
export const RUNS_DIR = path.join(PIPELINE_STATE_DIR, "runs");
export const RUN_USAGE_DIR = path.join(PIPELINE_STATE_DIR, "run_usage");
export const SCHEDULED_DIR = path.join(PIPELINE_STATE_DIR, "scheduled");
export const LINKEDIN_TOKEN_META_PATH = path.join(PIPELINE_STATE_DIR, "linkedin_token_meta.json");
export const SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");
export const ENV_PATH = path.join(REPO_ROOT, ".env");
export const VISUALS_DIR = path.join(process.cwd(), "public", "visuals");

export const KB_FILES = {
  profile: path.join(KB_DIR, "profile.md"),
  content_rules: path.join(KB_DIR, "content_rules.md"),
  writing_samples: path.join(KB_DIR, "writing_samples.md"),
  high_performing_posts: path.join(KB_DIR, "high_performing_posts.md"),
  strategy_log: path.join(KB_DIR, "strategy_log.md"),
} as const;

export type KbSection = keyof typeof KB_FILES;

// Strips any directory components from an ID before it's used to build a
// filesystem path (e.g. "../../etc/passwd" -> "passwd"). Use this any time
// an ID that flows in from a URL param or request body becomes a filename.
export function safeId(id: string): string {
  return path.basename(id);
}

// Resolves a web path like "/visuals/foo.png" (served from dashboard/public)
// to an absolute filesystem path, and throws if the result would escape the
// public/ directory — guards against a caller passing "../../../.env" etc.
export function resolvePublicAsset(webPath: string): string {
  const publicDir = path.join(process.cwd(), "public");
  const resolved = path.resolve(publicDir, `.${webPath}`);
  if (!resolved.startsWith(publicDir + path.sep)) {
    throw new Error(`Refusing to resolve path outside public/: ${webPath}`);
  }
  return resolved;
}
