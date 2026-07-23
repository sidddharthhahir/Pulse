# Pulse

*Your personal LinkedIn ghostwriter — a team of AI agents that researches, writes, and waits for your approval before anything ships.*

It's not one bot. It's 8 specialists — a researcher, a topic ranker, a hook writer, a content writer, a style editor, a strategist — coordinated by an orchestrator, with you in control at every checkpoint. Nothing publishes without your explicit yes.

There are **two ways to run it** — pick one, or use both:

| | Chat-based | Dashboard |
|---|---|---|
| Where | Inside [Claude Code](https://claude.com/claude-code), as slash commands | A standalone web app (`dashboard/`) |
| Model | Claude Code itself — no API key needed | Calls the Claude API directly — needs `ANTHROPIC_API_KEY` |
| Best for | Getting started fast, no setup | Watching a run live, managing drafts/schedule/cost over time |

---

## Option A — Chat-based (inside Claude Code)

**First time with Claude Code?** Read [`GETTING_STARTED.md`](./GETTING_STARTED.md) first — it walks through installing Claude Code and opening this folder, step by step.

1. **Open this folder in [Claude Code](https://claude.com/claude-code).**
2. **Type `/setup`.** The wizard interviews you — who you are, your audience, your pillars, your voice (paste a few things you've written). It writes your personal knowledge base from your answers. ~5 min.
3. **Type `/run-pipeline`.** The agents find this week's topics and draft posts in your voice. It **pauses at every checkpoint** — you pick topics, pick hooks, approve posts.

| Command | What it does |
|---|---|
| `/setup` | One-time onboarding — trains the system on you |
| `/run-pipeline` | Create this week's posts (the main loop) |
| `/add-writing-sample` | Feed a great post back in so it keeps learning your voice |
| `/linkedin-manager` | Periodic strategy review of your content + analytics |

---

## Option B — Dashboard (standalone web app)

A Next.js app that runs the same pipeline with a real UI — useful once you're posting regularly and want to see what's happening, track cost, and manage a backlog of drafts instead of a one-shot chat session.

```bash
cd dashboard
npm install
cp ../.env.example ../.env   # then add ANTHROPIC_API_KEY (required) and LINKEDIN_ACCESS_TOKEN (optional)
npm run dev
```

Open `http://localhost:3000`. If `knowledge_base/` is still the placeholder template, run `/setup` in Claude Code first (Option A) — the dashboard reads the same files, so setup only has to happen once no matter which interface you use afterward.

**What's in it:**

- **Dashboard** — posts this month, avg reactions, estimated API spend, next scheduled post, pillar balance (are you actually covering all your content pillars, or drifting to one), drafts-per-run trend.
- **Pipeline** — the same 4 stages (Discover → Develop → Write → Ship & Learn) as a live flow diagram, with a running activity log so you can see exactly what each agent is doing — not just a spinner. Shows a cost estimate before you commit to a batch of topics, and warns if it's higher than usual. Resumes automatically if you close the tab mid-run.
- **Idea Bank** — nothing generated gets thrown away. Topics that surfaced but weren't picked can be drafted on demand later ("Draft this →"). Drafts that were written but skipped in review stay here too, fully editable/approvable/schedulable — the API spend on them isn't wasted.
- **Drafts** — approved posts, with a place to log real performance (impressions/reactions/comments) once they're live, and a one-click "add to voice samples" for posts that landed well.
- **Scheduled** — queue posts for a future time. Firing them automatically requires a background job (see below) — the dashboard itself doesn't run posts while closed.
- **Comments** — paste someone else's LinkedIn post, get 3 comment options in your own voice.
- **Knowledge** — edit `knowledge_base/` files directly in the browser instead of a text editor.
- **Settings** — Claude/LinkedIn connection status, LinkedIn token expiry countdown, and whether the performance-learning loop has enough data yet to start influencing what gets written.

### Auto-publishing scheduled posts

The dashboard schedules posts, but something has to actually fire them. `scripts/publish_scheduled.py` checks for due posts and publishes them — run it on a schedule (macOS: a `launchd` agent calling it every 15 minutes works well; `cron` on Linux). Without this running somewhere, "Scheduled" posts stay queued until you publish them manually.

---

## Publishing options

Set during `/setup` (chat path) or `knowledge_base/profile.md` (either path), changeable anytime:

- **Dry-run** *(default until configured)* — drafts everything, posts nothing. Copy-paste it yourself.
- **LinkedIn auto-publish** — posts directly after your approval. Add your token to `.env` (see `.env.example`).

To enable LinkedIn publishing:
```bash
pip install -r requirements.txt
cp .env.example .env   # then add your LinkedIn token + URN
```

---

## It learns you

Every run gets sharper:
- After approving posts, you choose **what the system should remember** (a revision you made, a word you hate). It saves to your rules.
- After any post that lands, run `/add-writing-sample` (or click "Add to voice samples" in Drafts).
- Log real performance on published posts — once you've logged a handful, ranking and hook selection start favoring what's actually worked for you.
- The ranker remembers topics you've already passed on, so the same rejected idea doesn't keep resurfacing.
- Edit anything in `knowledge_base/` whenever you want, from either interface.

First few runs won't be perfect. Tell it what to change at the approval step — that's the whole point.

---

## What's inside

```
.claude/commands/   the things you type in Claude Code (/setup, /run-pipeline, ...)
.claude/agents/     the 8 specialists (run automatically)
knowledge_base/     YOU — your profile, voice, rules, inspiration (either interface fills this)
dashboard/          the standalone web app (Option B)
scripts/ + integrations/   LinkedIn publishing, used by both interfaces
```

Your knowledge base is yours. It never leaves your machine — `knowledge_base/profile.md`, `writing_samples.md`, `strategy_log.md`, and `pipeline_state/` (your run history, drafts, schedule) are all gitignored by default.
