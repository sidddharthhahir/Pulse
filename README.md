# Pulse

*Your personal LinkedIn ghostwriter — a team of AI agents that researches topics, writes posts in your voice, and waits for your approval before anything ships.*

It's not one bot. It's several specialists — a researcher, a topic ranker, a hook writer, a content writer, a style editor — coordinated through a pipeline, with you in control at every checkpoint. Nothing publishes without your explicit yes. Runs as a standalone web dashboard, calling the Claude API directly.

## Start in 4 steps (~5 minutes)

1. **Clone this repo** and install:
   ```bash
   cd dashboard
   npm install
   ```
2. **Configure your keys:**
   ```bash
   cp ../.env.example ../.env
   ```
   Add `ANTHROPIC_API_KEY` (required). `LINKEDIN_ACCESS_TOKEN` is optional — leave it unset and everything runs in dry-run (drafts everything, posts nothing) until you're ready to go live.
3. **Run it:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.
4. **Set yourself up.** On first open, `knowledge_base/` is still a placeholder template. Go to **Knowledge** in the sidebar and replace the placeholders with your real identity, audience, content pillars, voice, and rules. That's the one-time setup — every page reads from those files afterward.

Then open **Pipeline** and run your first batch of posts.

---

## What's in the dashboard

- **Dashboard** — posts this month, avg reactions, estimated API spend, next scheduled post, pillar balance (are you actually covering all your content pillars, or drifting to one), an Idea Bank backlog panel, and a LinkedIn token-expiry warning if it's about to lapse.
- **Pipeline** — four stages (Discover → Develop → Write → Ship & Learn) as a live flow diagram, with a running activity log so you can see exactly what's happening — not just a spinner. Shows a cost estimate before you commit to a batch of topics and warns if it's higher than usual. Hooks are pre-compared with the strongest one recommended, so you can usually just continue. Resumes automatically if you close the tab mid-run.
- **Idea Bank** — nothing generated gets thrown away. Topics that surfaced but weren't picked can be drafted on demand later ("Draft this →"). Drafts that were written but skipped in review stay here too, fully editable/approvable/schedulable — the API spend on them isn't wasted.
- **Drafts** — approved posts, with a place to log real performance (impressions/reactions/comments) once they're live, and a one-click "add to voice samples" for posts that landed well.
- **Scheduled** — queue posts for a future time. Firing them automatically requires a background job (see below) — the dashboard itself doesn't run posts while closed.
- **Comments** — paste someone else's LinkedIn post, get 3 comment options in your own voice.
- **Knowledge** — edit `knowledge_base/` files directly in the browser instead of a text editor. This is also where you do initial setup (step 4 above).
- **Settings** — Claude/LinkedIn connection status, LinkedIn token expiry countdown, and whether the performance-learning loop has enough data yet to start influencing what gets written.

### Auto-publishing scheduled posts

The dashboard schedules posts, but something has to actually fire them. `scripts/publish_scheduled.py` checks for due posts and publishes them — run it on a schedule (macOS: a `launchd` agent calling it every 15 minutes works well; `cron` on Linux). Without this running somewhere, "Scheduled" posts stay queued until you publish them manually.

---

## Publishing options

Set in `knowledge_base/profile.md` (editable from the Knowledge page):

- **Dry-run** *(default until configured)* — drafts everything, posts nothing. Copy-paste it yourself.
- **LinkedIn auto-publish** — posts directly after your approval. Add your token to `.env` (see `.env.example`).

```bash
pip install -r requirements.txt
cp .env.example .env   # then add your LinkedIn token + URN
```

---

## It learns you

Every run gets sharper:
- After approving posts, you choose what the system should remember (a revision you made, a word you hate) by editing the relevant `knowledge_base/` file.
- After any post that lands, click "Add to voice samples" in Drafts.
- Log real performance on published posts — once you've logged a handful, ranking and hook selection start favoring what's actually worked for you.
- The ranker remembers topics you've already passed on, so the same rejected idea doesn't keep resurfacing.

First few runs won't be perfect. Tell it what to change at the approval step — that's the whole point.

---

## What's inside

```
dashboard/        the app — pages, API routes, everything that runs
knowledge_base/   YOU — your profile, voice, rules, inspiration (edit via the Knowledge page)
scripts/          publish_post.py + publish_scheduled.py, called by the dashboard
integrations/     LinkedIn API client
pipeline_state/   your run history, drafts, and schedule (gitignored — stays on your machine)
```

Your knowledge base is yours. It never leaves your machine — `knowledge_base/profile.md`, `writing_samples.md`, `strategy_log.md`, and all of `pipeline_state/` are gitignored by default, so a fresh clone always starts blank.
