import fs from "fs/promises";
import { LINKEDIN_TOKEN_META_PATH, PIPELINE_STATE_DIR } from "./paths";
import { TokenMeta } from "./token-lifetime";

export type { TokenMeta } from "./token-lifetime";
export { LINKEDIN_TOKEN_LIFETIME_DAYS, daysRemaining } from "./token-lifetime";

export async function getTokenMeta(): Promise<TokenMeta | null> {
  try {
    const raw = await fs.readFile(LINKEDIN_TOKEN_META_PATH, "utf-8");
    return JSON.parse(raw) as TokenMeta;
  } catch {
    return null;
  }
}

export async function recordTokenIssuedNow(): Promise<TokenMeta> {
  await fs.mkdir(PIPELINE_STATE_DIR, { recursive: true });
  const meta: TokenMeta = { issued_at: new Date().toISOString() };
  await fs.writeFile(LINKEDIN_TOKEN_META_PATH, JSON.stringify(meta, null, 2), "utf-8");
  return meta;
}
