"""
LinkedIn API integration.

Uses the UGC Posts API (v2) to publish text posts to the user's profile, and
the memberCreatorPostAnalytics REST API to read back impressions/reactions/
comments on posts this account published.

Setup required for publishing:
1. Create a LinkedIn Developer App at https://www.linkedin.com/developers/
2. Add the "Share on LinkedIn" product (gives w_member_social permission)
3. Generate an access token (valid for 60 days — you'll need to refresh periodically)
4. Get your Person URN by calling GET https://api.linkedin.com/v2/me
5. Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN to your .env file

Setup required for auto-fetching performance (separate, optional):
6. Apply for the r_member_postAnalytics permission at developer.linkedin.com
   (not self-serve like Share on LinkedIn — it's a reviewed application).
   Until it's granted, get_post_analytics() below raises PermissionError and
   callers should fall back to manual logging in the dashboard.
"""

import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

_API_BASE = "https://api.linkedin.com/v2"
_REST_API_BASE = "https://api.linkedin.com/rest"
# LinkedIn REST APIs are versioned by calendar month (YYYYMM). Bump this
# periodically — LinkedIn deprecates old versions after roughly a year.
_LINKEDIN_API_VERSION = "202607"


def _headers() -> dict:
    token = os.getenv("LINKEDIN_ACCESS_TOKEN")
    if not token:
        raise EnvironmentError(
            "LINKEDIN_ACCESS_TOKEN not set. Add it to your .env file.\n"
            "See .env.example for setup instructions."
        )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }


def _register_image_upload(person_urn: str) -> tuple[str, str]:
    """Register an image upload and return (upload_url, asset_urn)."""
    payload = {
        "registerUploadRequest": {
            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
            "owner": person_urn,
            "serviceRelationships": [
                {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
            ],
        }
    }
    response = requests.post(
        f"{_API_BASE}/assets?action=registerUpload",
        headers=_headers(),
        json=payload,
        timeout=30,
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(f"LinkedIn image register error {response.status_code}: {response.text}")

    value = response.json()["value"]
    upload_url = value["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
    asset_urn = value["asset"]
    return upload_url, asset_urn


def _upload_image_bytes(upload_url: str, image_path: str) -> None:
    token = os.getenv("LINKEDIN_ACCESS_TOKEN")
    with open(image_path, "rb") as f:
        response = requests.put(
            upload_url,
            headers={"Authorization": f"Bearer {token}"},
            data=f.read(),
            timeout=60,
        )
    if response.status_code not in (200, 201):
        raise RuntimeError(f"LinkedIn image upload error {response.status_code}: {response.text}")


def post(text: str, image_path: str | None = None, article_url: str | None = None) -> dict:
    """
    Publish a text post to LinkedIn, optionally with an attached image or a
    link-preview card for a source article.

    Args:
        text: The post text (plain text, no HTML)
        image_path: Optional path to a local image file to attach
        article_url: Optional source article URL to attach as a link-preview
            card (mutually exclusive with image_path — if both are given,
            the article preview takes precedence)

    Returns:
        Dict with "post_url" key, or raises on failure
    """
    person_urn = os.getenv("LINKEDIN_PERSON_URN")
    if not person_urn:
        raise EnvironmentError(
            "LINKEDIN_PERSON_URN not set. Add it to your .env file.\n"
            "Format: urn:li:person:XXXXXXXX\n"
            "Find it via: GET https://api.linkedin.com/v2/me"
        )

    share_content: dict = {
        "shareCommentary": {"text": text},
        "shareMediaCategory": "NONE",
    }

    if article_url:
        share_content["shareMediaCategory"] = "ARTICLE"
        share_content["media"] = [{"status": "READY", "originalUrl": article_url}]
    elif image_path:
        upload_url, asset_urn = _register_image_upload(person_urn)
        _upload_image_bytes(upload_url, image_path)
        share_content["shareMediaCategory"] = "IMAGE"
        share_content["media"] = [{"status": "READY", "media": asset_urn}]

    payload = {
        "author": person_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": share_content
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    response = requests.post(
        f"{_API_BASE}/ugcPosts",
        headers=_headers(),
        json=payload,
        timeout=30,
    )

    if response.status_code not in (200, 201):
        raise RuntimeError(
            f"LinkedIn API error {response.status_code}: {response.text}"
        )

    # LinkedIn returns the post ID in the X-RestLi-Id header
    post_id = response.headers.get("X-RestLi-Id", "")
    post_url = f"https://www.linkedin.com/feed/update/{post_id}/" if post_id else "Published (URL unavailable)"

    return {"post_url": post_url, "post_id": post_id}


def _urn_from_post_url(post_url: str) -> tuple[str, str] | None:
    """Extract (entity_type, urn) from a stored post_url like
    'https://www.linkedin.com/feed/update/urn:li:share:123/'. Returns None if
    the URL doesn't contain a recognizable urn (e.g. a dry-run placeholder)."""
    match = re.search(r"urn:li:(share|ugcPost):(\d+)", post_url)
    if not match:
        return None
    kind, post_number = match.groups()
    entity_type = "share" if kind == "share" else "ugc"
    return entity_type, f"urn:li:{kind}:{post_number}"


def get_post_analytics(post_url: str) -> dict:
    """
    Fetch total impressions/reactions/comments for one of this account's own
    published posts via the memberCreatorPostAnalytics API.

    Raises PermissionError if the r_member_postAnalytics permission hasn't
    been granted to this token yet (403) — callers should catch this
    specifically and fall back to manual logging rather than treating it as
    a generic failure.
    """
    parsed = _urn_from_post_url(post_url)
    if not parsed:
        raise ValueError(f"Couldn't extract a post URN from: {post_url}")
    entity_type, urn = parsed

    headers = _headers()
    headers["Linkedin-Version"] = _LINKEDIN_API_VERSION

    result: dict[str, int] = {}
    metric_to_field = {"IMPRESSION": "impressions", "REACTION": "reactions", "COMMENT": "comments"}
    for metric, field in metric_to_field.items():
        response = requests.get(
            f"{_REST_API_BASE}/memberCreatorPostAnalytics",
            headers=headers,
            params={
                "q": "entity",
                "entity": f"({entity_type}:{urn})",
                "queryType": metric,
                "aggregation": "TOTAL",
            },
            timeout=30,
        )
        if response.status_code == 403:
            raise PermissionError(
                "LinkedIn returned 403 for memberCreatorPostAnalytics — the r_member_postAnalytics "
                "permission likely hasn't been granted to this token yet. See integrations/linkedin.py "
                "docstring for how to apply."
            )
        if response.status_code != 200:
            raise RuntimeError(f"LinkedIn analytics error {response.status_code}: {response.text}")

        elements = response.json().get("elements", [])
        result[field] = elements[0]["count"] if elements else 0

    return result
