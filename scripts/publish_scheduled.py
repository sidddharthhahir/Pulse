"""
Checks pipeline_state/scheduled/*.json for posts due to publish and posts them.

Meant to run periodically outside the dashboard (cron/launchd) so scheduled
posts fire even when the Next.js dev server isn't open. Safe to run often —
it only acts on "pending" posts whose scheduled_at has passed.

Usage:
    python scripts/publish_scheduled.py
    python scripts/publish_scheduled.py --dry-run   # force dry-run regardless of token

To automate on macOS, add a cron entry, e.g. every 15 minutes:
    */15 * * * * cd /path/to/cadence && python3 scripts/publish_scheduled.py >> pipeline_state/scheduled.log 2>&1
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

from dotenv import load_dotenv
load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEDULED_DIR = REPO_ROOT / "pipeline_state" / "scheduled"


def main():
    parser = argparse.ArgumentParser(description="Publish due scheduled posts")
    parser.add_argument("--dry-run", action="store_true", help="Force dry-run regardless of LinkedIn token")
    args = parser.parse_args()

    if not SCHEDULED_DIR.exists():
        print("No scheduled posts directory yet — nothing to do.")
        return

    now = datetime.now(timezone.utc)
    has_token = bool(os.getenv("LINKEDIN_ACCESS_TOKEN")) and not args.dry_run

    due = []
    for f in SCHEDULED_DIR.glob("*.json"):
        try:
            post = json.loads(f.read_text())
            if post.get("status") != "pending":
                continue
            scheduled_at = datetime.fromisoformat(post["scheduled_at"].replace("Z", "+00:00"))
            if scheduled_at <= now:
                due.append((f, post))
        except Exception as e:
            # A single malformed/corrupted file shouldn't take down the whole
            # run — skip it and keep processing the rest.
            print(f"Skipping unreadable scheduled post {f.name}: {e}")

    if not due:
        print(f"[{now.isoformat()}] No posts due.")
        return

    from integrations.linkedin import post as linkedin_post

    for f, post in due:
        print(f"Publishing scheduled post: '{post['topic_title']}' (was due {post['scheduled_at']})")
        try:
            if has_token:
                image_path = post.get("image_path")
                if image_path:
                    # image_path is a web path like "/visuals/foo.png" served
                    # from dashboard/public — resolve to a real filesystem path
                    image_path = str(REPO_ROOT / "dashboard" / "public" / image_path.lstrip("/"))
                result = linkedin_post(
                    text=post["text"],
                    image_path=image_path,
                    article_url=post.get("article_url"),
                )
                post["status"] = "published"
                post["publish_result"] = {"dry_run": False, "url": result.get("post_url"), "output": ""}
            else:
                post["status"] = "published"
                post["publish_result"] = {"dry_run": True, "output": "[DRY RUN] LinkedIn token not set"}
            print(f"  -> {post['status']}")
        except Exception as e:
            post["status"] = "failed"
            post["error"] = str(e)
            print(f"  -> failed: {e}")

        f.write_text(json.dumps(post, indent=2))


if __name__ == "__main__":
    main()
