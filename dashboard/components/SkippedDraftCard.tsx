"use client";

import { useState } from "react";
import PostApprovalCard from "./PostApprovalCard";
import { Decision, Draft, RunRecord } from "@/lib/types";

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

// Fetches the full run (so we don't clobber other drafts' decisions in it),
// applies a mutation, and saves it back.
async function mutateRun(runId: string, mutate: (run: RunRecord) => RunRecord): Promise<void> {
  const res = await fetch("/api/runs");
  const data = (await res.json()) as { runs: RunRecord[] };
  const run = data.runs.find((r) => r.id === runId);
  if (!run) throw new Error("Run not found");
  await postJson("/api/runs", mutate(run));
}

// A draft that was skipped still cost real API spend to write — this card
// lets you come back later and actually approve, revise, or schedule it,
// instead of the content just disappearing once the run finished.
export default function SkippedDraftCard({ runId, draft: initialDraft }: { runId: string; draft: Draft }) {
  const [draft, setDraft] = useState(initialDraft);
  const [decision, setDecision] = useState<Decision | undefined>(undefined);
  const [scheduledAt, setScheduledAt] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    try {
      const result = await postJson<{ dry_run: boolean; url?: string; output: string }>("/api/publish", {
        topic: draft.topic_title,
        text: draft.text,
        image_path: draft.image_path,
        article_url: draft.source_url,
      });
      await mutateRun(runId, (run) => ({
        ...run,
        decisions: { ...run.decisions, [draft.topic_title]: { decision: "approved" } },
        publish_results: { ...run.publish_results, [draft.topic_title]: result },
      }));
      setDecision("approved");
    } catch (e) {
      setError(`Failed to publish: ${(e as Error).message}`);
    }
  }

  async function handleSchedule(isoDateTime: string) {
    await postJson("/api/scheduled", {
      run_id: runId,
      topic_title: draft.topic_title,
      pillar: draft.pillar,
      text: draft.text,
      image_path: draft.image_path,
      article_url: draft.source_url,
      scheduled_at: isoDateTime,
    });
    await mutateRun(runId, (run) => ({
      ...run,
      decisions: { ...run.decisions, [draft.topic_title]: { decision: "approved", scheduled_at: isoDateTime } },
    }));
    setDecision("approved");
    setScheduledAt(isoDateTime);
  }

  async function handleRevise(feedback: string) {
    const revised = await postJson<Draft>("/api/edit", { draft, feedback, run_id: runId });
    const withMeta = { ...revised, image_path: draft.image_path, source_url: draft.source_url };
    setDraft(withMeta);
    await mutateRun(runId, (run) => ({
      ...run,
      drafts: run.drafts.map((d) => (d.topic_title === draft.topic_title ? withMeta : d)),
      decisions: { ...run.decisions, [draft.topic_title]: { decision: "revised", final_text: withMeta.text } },
    }));
  }

  async function handleSkip() {
    await mutateRun(runId, (run) => ({
      ...run,
      decisions: { ...run.decisions, [draft.topic_title]: { decision: "skipped" } },
    }));
    setDecision("skipped");
  }

  return (
    <div>
      {error && (
        <div
          className="font-mono text-[12.5px] px-3.5 py-2.5 mb-2"
          style={{ border: "1px solid oklch(0.65 0.2 25 / 0.5)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}
      <PostApprovalCard
        draft={draft}
        decision={decision === "skipped" ? undefined : decision}
        scheduledAt={scheduledAt}
        onApprove={handleApprove}
        onRevise={handleRevise}
        onSkip={handleSkip}
        onSchedule={handleSchedule}
      />
    </div>
  );
}
