"use client";

import { useEffect, useState } from "react";
import { ScheduledPost } from "@/lib/types";

function statusColor(post: ScheduledPost): string {
  if (post.status === "pending") return "var(--warn)";
  if (post.status === "published") return post.publish_result?.dry_run ? "var(--muted)" : "var(--accent)";
  return "var(--danger)";
}

function statusLabel(post: ScheduledPost): string {
  if (post.status === "published" && post.publish_result?.dry_run) return "dry run";
  if (post.status === "pending") return "queued";
  return post.status;
}

export default function ScheduledPage() {
  const [posts, setPosts] = useState<ScheduledPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/scheduled");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.posts);
    } catch {
      setError("Couldn't load scheduled posts.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "cancel" | "publish_now") {
    setActingOn(id);
    setError(null);
    try {
      const res = await fetch(`/api/scheduled/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError(`Couldn't ${action === "cancel" ? "cancel" : "publish"} that post — try again.`);
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">Publish queue</div>
      <h1 className="text-[38px] font-bold mb-4">Scheduled</h1>
      <p className="text-term-muted text-base max-w-[720px] leading-relaxed mb-7">
        Posts queued for later. Run{" "}
        <span className="font-mono text-term-accent text-[14px]">scripts/publish_scheduled.py</span> on a
        cron/launchd schedule to fire these automatically even with the dashboard closed — otherwise use
        &quot;Publish now&quot; here manually.
      </p>

      {error && (
        <div className="p-3 mb-5 text-sm font-mono" style={{ border: "1px solid oklch(0.65 0.2 25 / 0.5)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {posts === null && <div className="font-mono text-sm text-term-dim">Loading...</div>}
      {posts?.length === 0 && <div className="dashed-empty">Nothing scheduled.</div>}

      {posts && posts.length > 0 && (
        <div className="panel-outline">
          <div className="grid grid-cols-[1fr_2fr_1fr_100px] gap-3 px-5 py-3 mono-label border-b border-term">
            <span>Pillar</span>
            <span>Headline</span>
            <span>Publish at</span>
            <span>Status</span>
          </div>
          {posts.map((post) => (
            <div key={post.id} className="border-b border-term-soft last:border-b-0">
              <button
                className="grid grid-cols-[1fr_2fr_1fr_100px] gap-3 px-5 py-4 items-center w-full text-left cursor-pointer hover:bg-[oklch(0.82_0.19_150_/_0.03)]"
                onClick={() => setExpanded(expanded === post.id ? null : post.id)}
              >
                <span className="font-mono text-[12.5px] text-[oklch(0.7_0.01_90)] truncate">{post.pillar}</span>
                <span className="text-[14px] truncate">{post.topic_title}</span>
                <span className="font-mono text-[12.5px] text-[oklch(0.7_0.01_90)]">
                  {new Date(post.scheduled_at).toLocaleString(undefined, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="font-mono text-[12px]" style={{ color: statusColor(post) }}>
                  {statusLabel(post)}
                </span>
              </button>
              {expanded === post.id && (
                <div className="px-5 pb-5 animate-phase-in">
                  <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.7] text-term-body mb-4">{post.text}</pre>
                  {post.publish_result && (
                    <div className="font-mono text-[12.5px] text-term-dim mb-3">
                      {post.publish_result.dry_run ? "Dry run — not published" : `Published: ${post.publish_result.url}`}
                    </div>
                  )}
                  {post.error && (
                    <div className="font-mono text-[12.5px] mb-3" style={{ color: "var(--danger)" }}>
                      {post.error}
                    </div>
                  )}
                  {post.status === "pending" && (
                    <div className="flex gap-2.5">
                      <button className="btn-primary btn-sm" disabled={actingOn === post.id} onClick={() => act(post.id, "publish_now")}>
                        {actingOn === post.id ? "Working..." : "Publish now"}
                      </button>
                      <button className="btn-outline btn-sm" disabled={actingOn === post.id} onClick={() => act(post.id, "cancel")}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
