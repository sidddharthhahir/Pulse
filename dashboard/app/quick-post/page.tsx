"use client";

import { useState } from "react";
import ErrorBanner from "@/components/ErrorBanner";
import { RunRecord } from "@/lib/types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request to ${url} failed`);
  return data as T;
}

// A quick post still gets a minimal run record, not just a ScheduledPost —
// that's what makes it show up in Drafts once published, eligible for
// performance logging, and counted by the same analytics (best-time,
// image-nudge, voice-DNA auto-bank) that pipeline-generated posts get.
// Nothing here goes through research/hooks/write/edit — the text is yours.
function buildRun(topicTitle: string, pillar: string, text: string, imagePath: string | undefined, isoDateTime: string): RunRecord {
  const now = new Date().toISOString();
  return {
    id: `run_manual_${Date.now()}`,
    created_at: now,
    updated_at: now,
    status: "completed",
    ranked_topics: [
      { rank: 1, title: topicTitle, source: "Your idea", pillar, format: "standard", angle: "Written outside the pipeline.", why_now: "" },
    ],
    selected_topics: [topicTitle],
    discarded_topics: [],
    research_briefs: [],
    hooks: [],
    selected_hooks: {},
    drafts: [
      {
        topic_title: topicTitle,
        pillar,
        hook: text.split("\n")[0].slice(0, 120),
        text,
        word_count: text.trim().split(/\s+/).filter(Boolean).length,
        image_path: imagePath,
      },
    ],
    decisions: { [topicTitle]: { decision: "approved", scheduled_at: isoDateTime } },
    publish_results: {},
    performance: {},
  };
}

export default function QuickPostPage() {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function pickImage(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function schedule() {
    setError(null);
    setSubmitting(true);
    try {
      let imagePath: string | undefined;
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        const res = await fetch("/api/upload-image", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Image upload failed");
        imagePath = data.image_path;
      }

      const topicTitle = text.trim().split("\n")[0].slice(0, 80) || `Quick post ${Date.now()}`;
      const isoDateTime = new Date(scheduledAt).toISOString();
      const run = buildRun(topicTitle, "Manual post", text.trim(), imagePath, isoDateTime);

      await postJson("/api/runs", run);
      await postJson("/api/scheduled", {
        run_id: run.id,
        topic_title: topicTitle,
        pillar: "Manual post",
        text: text.trim(),
        image_path: imagePath,
        scheduled_at: isoDateTime,
      });

      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setText("");
    pickImage(null);
    setScheduledAt("");
    setDone(false);
    setError(null);
  }

  return (
    <div className="animate-phase-in max-w-[720px]">
      <div className="eyebrow mb-2.5">Skip the pipeline</div>
      <h1 className="text-[38px] font-bold mb-2">Quick Post</h1>
      <p className="text-term-muted text-base leading-relaxed mb-7">
        Already wrote it yourself? Paste the text, attach an image if you want one, pick a time — Pulse queues and
        auto-publishes it exactly like a pipeline post, no research or drafting involved.
      </p>

      {error && <ErrorBanner message={error} className="mb-5" />}

      {done ? (
        <div className="panel px-8 py-7 text-[15px] font-mono">
          ✓ Scheduled for {new Date(scheduledAt).toLocaleString()}. It&apos;ll auto-publish at that time — check{" "}
          <a href="/scheduled" className="text-term-accent">
            Scheduled
          </a>{" "}
          to see it queued, edit it, or publish it early.
          <div className="mt-4">
            <button className="btn-outline btn-sm" onClick={reset}>
              Schedule another
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="mono-label block mb-2">Post text</label>
            <textarea
              className="terminal-input h-56 w-full resize-y"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or write the full post exactly as it should appear on LinkedIn..."
              aria-label="Post text"
            />
          </div>

          <div>
            <label className="mono-label block mb-2">Image (optional)</label>
            {imagePreview ? (
              <div className="space-y-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Selected attachment" className="w-full max-w-sm panel-outline" />
                <button className="btn-outline btn-sm" onClick={() => pickImage(null)}>
                  Remove image
                </button>
              </div>
            ) : (
              <label className="btn-outline btn-sm cursor-pointer inline-block">
                Choose image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <div>
            <label className="mono-label block mb-2">Publish at</label>
            <input
              type="datetime-local"
              className="terminal-input !w-auto !p-2.5 text-sm"
              value={scheduledAt}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <button
            className="btn-primary text-[15px]"
            disabled={!text.trim() || !scheduledAt || submitting}
            onClick={schedule}
          >
            {submitting ? "Scheduling..." : "Schedule post"}
          </button>
        </div>
      )}
    </div>
  );
}
