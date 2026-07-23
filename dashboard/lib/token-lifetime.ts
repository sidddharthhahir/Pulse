// Pure, client-safe logic for LinkedIn token expiry — no fs import, so this
// can be shared between server code (lib/linkedin-token.ts) and client
// components (TokenStatus.tsx) without pulling Node built-ins into the
// browser bundle.

// LinkedIn access tokens are valid ~60 days from issuance (5,184,000 seconds).
export const LINKEDIN_TOKEN_LIFETIME_DAYS = 60;

export interface TokenMeta {
  issued_at: string;
}

export function daysRemaining(meta: TokenMeta): number {
  const ageDays = (Date.now() - new Date(meta.issued_at).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(LINKEDIN_TOKEN_LIFETIME_DAYS - ageDays));
}
