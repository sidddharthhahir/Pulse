"""
Periodically fetches real impressions/reactions/comments for this account's
published posts via LinkedIn's memberCreatorPostAnalytics API, and logs them
into Pulse automatically — no manual entry in Drafts needed once the
r_member_postAnalytics permission is granted (see integrations/linkedin.py
for how to apply).

Falls back cleanly (does nothing beyond one clear log line) if that
permission hasn't been granted yet — publishing and everything else in Pulse
work fine without it; this script is purely additive.

Also auto-banks a post into voice samples once its performance clearly beats
the average of what's already tracked (with a real sample-size floor before
"beats the average" means anything) — replacing the manual "Add to voice
samples" click for posts that demonstrably worked.

Usage:
    python scripts/sync_performance.py

To automate on macOS, add a launchd agent calling this every few hours —
impressions keep accumulating for a day or two after a post goes out, so
running it much more often than that has diminishing returns.
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

from dotenv import load_dotenv
load_dotenv()

import requests
from integrations.linkedin import get_post_analytics

REPO_ROOT = Path(__file__).resolve().parent.parent
STATUS_PATH = REPO_ROOT / "pipeline_state" / "linkedin_analytics_status.json"
AUTO_BANKED_PATH = REPO_ROOT / "pipeline_state" / "auto_banked.json"
DASHBOARD_BASE = "http://localhost:3000"
SYNC_WINDOW_DAYS = 30  # only bother re-syncing posts published in this window
MIN_SAMPLE_FOR_AUTOBANK = 3  # mirrors MIN_SAMPLE in dashboard/lib/analytics.ts


def write_status(granted: bool, detail: str) -> None:
    STATUS_PATH.write_text(json.dumps({
        "granted": granted,
        "detail": detail,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2))


def load_auto_banked() -> set:
    if not AUTO_BANKED_PATH.exists():
        return set()
    try:
        return set(json.loads(AUTO_BANKED_PATH.read_text()))
    except Exception:
        return set()


def save_auto_banked(banked: set) -> None:
    AUTO_BANKED_PATH.write_text(json.dumps(sorted(banked), indent=2))


def main():
    try:
        runs = requests.get(f"{DASHBOARD_BASE}/api/runs", timeout=10).json()["runs"]
    except Exception as e:
        print(f"Couldn't reach the dashboard at {DASHBOARD_BASE} — is it running? {e}")
        return

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=SYNC_WINDOW_DAYS)

    candidates = []
    for run in runs:
        updated_at = datetime.fromisoformat(run["updated_at"].replace("Z", "+00:00"))
        if updated_at < cutoff:
            continue
        for topic_title, result in (run.get("publish_results") or {}).items():
            if result.get("dry_run") or not result.get("url"):
                continue
            candidates.append((run["id"], topic_title, result["url"]))

    if not candidates:
        print(f"[{now.isoformat()}] No recently-published posts to sync.")
        return

    already_tracked_impressions = [
        perf["impressions"]
        for run in runs
        for perf in (run.get("performance") or {}).values()
        if perf.get("impressions") is not None
    ]
    auto_banked = load_auto_banked()

    synced = 0
    for run_id, topic_title, url in candidates:
        bank_key = f"{run_id}::{topic_title}"
        try:
            analytics = get_post_analytics(url)
        except PermissionError as e:
            write_status(False, str(e))
            print(f"[{now.isoformat()}] {e}")
            print("Stopping — this permission affects every post, not just this one. Falling back to manual logging in Drafts until it's granted.")
            return
        except Exception as e:
            print(f"  '{topic_title[:50]}' — sync failed: {e}")
            continue

        write_status(True, "OK")
        try:
            requests.post(f"{DASHBOARD_BASE}/api/performance", json={
                "run_id": run_id,
                "topic_title": topic_title,
                **analytics,
            }, timeout=10)
            synced += 1
            print(f"  '{topic_title[:50]}' — {analytics['impressions']} impressions, {analytics['reactions']} reactions, {analytics['comments']} comments")
        except Exception as e:
            print(f"  '{topic_title[:50]}' — got analytics but failed to save: {e}")
            continue

        if bank_key not in auto_banked and len(already_tracked_impressions) >= MIN_SAMPLE_FOR_AUTOBANK:
            avg = sum(already_tracked_impressions) / len(already_tracked_impressions)
            if analytics["impressions"] > avg:
                try:
                    run = next(r for r in runs if r["id"] == run_id)
                    draft = next((d for d in run["drafts"] if d["topic_title"] == topic_title), None)
                    text = (run.get("decisions", {}).get(topic_title, {}) or {}).get("final_text") or (draft or {}).get("text")
                    if text:
                        requests.post(f"{DASHBOARD_BASE}/api/writing-sample", json={
                            "text": text,
                            "performance_note": f"{analytics['impressions']} impressions, {analytics['reactions']} reactions, {analytics['comments']} comments (auto-synced)",
                            "why_note": f"Auto-banked — beat the {avg:.0f}-impression average across {len(already_tracked_impressions)} tracked posts",
                        }, timeout=10)
                        auto_banked.add(bank_key)
                        print(f"    -> auto-banked to voice samples (beat avg of {avg:.0f} across {len(already_tracked_impressions)} posts)")
                except Exception as e:
                    print(f"    -> auto-bank failed (non-fatal): {e}")
        already_tracked_impressions.append(analytics["impressions"])

    save_auto_banked(auto_banked)
    print(f"[{now.isoformat()}] Synced {synced}/{len(candidates)} post(s).")


if __name__ == "__main__":
    main()
