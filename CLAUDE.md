# Pulse

A LinkedIn content pipeline: research topics, write posts in the user's voice, hold for approval, publish. Runs as a standalone Next.js dashboard (`dashboard/`) that calls the Claude API directly — no other execution mode. `ANTHROPIC_API_KEY` is required; `LINKEDIN_ACCESS_TOKEN` is optional and gates real publishing vs. dry-run.

**Never publish a post without explicit approval at the review checkpoint. Never overwrite the user's knowledge base without telling them.**

---

## Who this is for

The user's identity, audience, goals, content pillars, voice, and story bank live in `knowledge_base/profile.md` and `knowledge_base/writing_samples.md` — read those first; they're the source of truth for who this is and how they sound. If `knowledge_base/profile.md` is still the placeholder template (bracketed `[...]` fields), the user hasn't set up yet — point them to the Knowledge page in the dashboard sidebar.

---

## Architecture

```
dashboard/app/page.tsx            →  Dashboard (stats, pillar balance, Idea Bank backlog)
dashboard/app/pipeline/page.tsx   →  Discover → Develop → Write → Ship & Learn, client-driven
dashboard/app/api/*/route.ts      →  One route per pipeline stage, each calls Claude directly
dashboard/app/idea-bank/page.tsx  →  Revisit discarded topics + skipped drafts (nothing is wasted)
dashboard/app/{drafts,scheduled,comments,knowledge,logs,settings}/  →  supporting pages
dashboard/lib/                    →  fs-backed persistence (pipeline_state/), Claude client, types
scripts/publish_post.py           →  called by /api/publish and /api/scheduled/[id]
scripts/publish_scheduled.py      →  run on a schedule (launchd/cron) outside the dashboard —
                                      fires due scheduled posts even when the app isn't open
knowledge_base/                   →  the user's profile, voice, content rules (their data, not code)
pipeline_state/                   →  run history, drafts, schedule, usage — gitignored, local only
```

**Pipeline stages** (each a route under `dashboard/app/api/`): `research` → `rank` → (user picks topics) → `deep-research` + `hooks` per topic → (user picks/confirms hooks — Claude pre-recommends one of 3) → `write` + `edit` per topic → (user approves/revises/schedules) → `publish`.

**Cost discipline, load-bearing, don't regress it:**
- `thinking: { type: "disabled" }` (via `THINKING_DISABLED` in `lib/claude.ts`) on every JSON-extraction stage (research, rank, deep-research, hooks, edit, comment, image-prompt). Sonnet 5 runs adaptive thinking by *default* when `thinking` is omitted — leaving it off costs real money for reasoning these stages don't need. `write` is the one stage that keeps adaptive thinking on, deliberately.
- `staticBlock()` / `dynamicBlock()` (also in `lib/claude.ts`) split prompts into a cached static prefix (KB text, instructions) and an uncached dynamic suffix (per-topic data) — this is what makes prompt caching actually hit across the 3 topics in one run. Don't collapse these back into a single string; that silently kills the cache.
- Per-run usage is tracked via `recordRunUsage` (pass `run_id` through `createTracked`) so the dashboard can show what one run cost, not just a monthly total.

**If the dashboard is set up to run 24/7, it's as a launchd LaunchAgent** (`~/Library/LaunchAgents/com.pulse.dashboard.plist` on macOS, if the user has followed the 24/7 setup) — `next dev -p 3000` running continuously with KeepAlive + RunAtLoad, so it survives crashes and reboots without anyone starting it by hand. This means **`npm run build` must never be run directly in `dashboard/` while that service might be live** — it shares the `.next` output directory with the running `next dev` process and corrupts it, breaking every page's styling until the service is killed and restarted with `.next` deleted (this happened once already, mid-session, from exactly this). If a production-build check is genuinely needed, use a separate `distDir` or check it in an isolated worktree — don't build in-place while the service is running. Check with `launchctl list | grep pulse`; logs land in `pipeline_state/dashboard.log`.

---

## Key files

- `dashboard/lib/paths.ts` — every filesystem path + `safeId()`/`resolvePublicAsset()` (path-traversal guards; use them any time an ID or web path from a request becomes a real filesystem path)
- `dashboard/lib/claude.ts` — the only place that should call the Anthropic SDK directly; every route goes through `createTracked()`
- `dashboard/lib/types.ts` — `RunRecord` is the persisted shape of one pipeline run; keep it in sync with what the API routes actually return (it's bitten before — `RankedTopic` used to claim a field `/api/rank` never sent)
- `knowledge_base/content_rules.md` — the post-writing rules, treated as law by `write`/`edit`. Has an explicit anti-essay section (sentence-rhythm limits, mandatory arrow-lists for parallel points) — LinkedIn posts get skimmed, not read, and it's easy for output to drift back into dense uniform paragraphs without that enforced.

---

## Golden rules

1. **Approval is sacred.** Nothing publishes without the user saying yes at the review checkpoint.
2. **The voice is theirs.** Calibrate to `writing_samples.md` + `profile.md`. Never corporate-ify it.
3. **Opinion over information.** Every post needs a held view, not a summary — and needs to read like a post, not an article (see content_rules.md's rhythm/scannability section).
4. **Fix root causes, not symptoms.** Cost, dead links, and stale docs in this repo have all previously been "fixed" by patching the symptom once already — check *why* before patching again (e.g. the scheduled-publish launchd job silently failing because of a hardcoded path after a folder rename was a real incident, not hypothetical).
