# Pulse

Professional LinkedIn content pipeline that researches topics, drafts posts in your voice, and publishes only after explicit approval.

## Overview

Pulse is a standalone Next.js dashboard for managing a full LinkedIn writing workflow: topic discovery, post development, drafting, review, scheduling, and publishing. It uses Claude directly, stores your working data locally, and supports dry-run mode when publishing credentials are not configured.

## Key Features

- End-to-end pipeline: Discover → Develop → Write → Ship & Learn
- Human-in-the-loop publishing gate (no publish without approval)
- Voice personalization through knowledge base and writing samples
- Topic ranking, hook generation, drafting, and editing workflows
- Draft management, scheduled publishing, and idea backlog
- Usage/cost tracking and run history per pipeline run

## Tech Stack

- Next.js (dashboard application)
- TypeScript
- Node.js / npm
- Python scripts for publishing automation
- Anthropic Claude API
- LinkedIn API (optional for live publishing)

## Setup and Run

1. Clone the repository.
2. Install dashboard dependencies:

```bash
cd dashboard
npm install
```

3. Configure environment variables:

```bash
cp ../.env.example ../.env
```

Set:
- `ANTHROPIC_API_KEY` (required)
- `LINKEDIN_ACCESS_TOKEN` (optional; enables real publishing)

4. Start the dashboard:

```bash
npm run dev
```

5. Open `http://localhost:3000` and complete your Knowledge setup in the dashboard sidebar.

## Usage

- Run pipeline batches from the **Pipeline** page.
- Review and approve generated drafts before publish.
- Use **Scheduled** for queued posts.
- Run `scripts/publish_scheduled.py` on a system schedule (launchd/cron) for automatic scheduled publishing.

## Project Structure

```text
dashboard/        Next.js app (pages, API routes, pipeline UI)
knowledge_base/   Profile, writing samples, and content rules
scripts/          Publishing and scheduled publishing scripts
integrations/     LinkedIn integration client code
pipeline_state/   Local run history, drafts, and schedule data (gitignored)
```

## Contribution

Contributions are welcome. Open an issue to discuss changes, then submit a focused pull request.

## License / Contact

Licensed under [MIT](LICENSE). For usage or collaboration inquiries, contact the repository owner: @sidddharthhahir.
