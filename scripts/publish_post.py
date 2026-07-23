"""
CLI wrapper for publishing a LinkedIn post.

Called by the Claude Code pipeline (Case B) via Bash.
Notion archiving is handled directly via Notion MCP in the orchestrator.

Usage:
    python scripts/publish_post.py --topic "Topic Title" --text "Full post text"
    python scripts/publish_post.py --topic "Topic Title" --text "Full post text" --dry-run
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Publish a LinkedIn post")
    parser.add_argument("--topic", required=True, help="Post topic / title")
    parser.add_argument("--text", required=True, help="Full post text to publish")
    parser.add_argument("--image", default=None, help="Optional path to an image to attach")
    parser.add_argument("--article-url", default=None, help="Optional source article URL to attach as a link-preview card")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen without posting")
    args = parser.parse_args()

    if args.dry_run:
        print(f"\n[DRY RUN] Would publish: '{args.topic}'")
        print(f"[DRY RUN] Text ({len(args.text)} chars):")
        print("-" * 40)
        print(args.text)
        print("-" * 40)
        if args.article_url:
            print(f"[DRY RUN] Would attach link preview: {args.article_url}")
        elif args.image:
            print(f"[DRY RUN] Would attach image: {args.image}")
        print("[DRY RUN] LinkedIn: skipped")
        return

    print(f"Posting to LinkedIn: '{args.topic}'...")
    try:
        from integrations.linkedin import post as linkedin_post
        result = linkedin_post(text=args.text, image_path=args.image, article_url=args.article_url)
        print(f"Published: {result.get('post_url')}")
        print(f"RESULT linkedin_url: {result.get('post_url')}")
    except Exception as e:
        print(f"LinkedIn post failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
