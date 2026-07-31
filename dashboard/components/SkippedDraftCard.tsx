"use client";

import { useState } from "react";
import PostApprovalCard from "./PostApprovalCard";
import ErrorBanner from "./ErrorBanner";
import { mutateRun } from "@/lib/mutate-run";
import { Decision, Draft } from "@/lib/types";

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
    setError(null);
    try {
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
    } catch (e) {
      setError(`Failed to schedule: ${(e as Error).message}`);
    }
  }

  async function handleRevise(feedback: string) {
    setError(null);
    try {
      const revised = await postJson<Draft>("/api/edit", { draft, feedback, run_id: runId });
      const withMeta = { ...revised, image_path: draft.image_path, source_url: draft.source_url };
      setDraft(withMeta);
      await mutateRun(runId, (run) => ({
        ...run,
        drafts: run.drafts.map((d) => (d.topic_title === draft.topic_title ? withMeta : d)),
        decisions: { ...run.decisions, [draft.topic_title]: { decision: "revised", final_text: withMeta.text } },
      }));
    } catch (e) {
      setError(`Failed to revise: ${(e as Error).message}`);
    }
  }

  async function handleSkip() {
    setError(null);
    try {
      await mutateRun(runId, (run) => ({
        ...run,
        decisions: { ...run.decisions, [draft.topic_title]: { decision: "skipped" } },
      }));
      setDecision("skipped");
    } catch (e) {
      setError(`Failed to skip: ${(e as Error).message}`);
    }
  }

  async function handleAttachImage(imagePath: string | undefined) {
    setError(null);
    const withImage = { ...draft, image_path: imagePath };
    setDraft(withImage);
    try {
      await mutateRun(runId, (run) => ({
        ...run,
        drafts: run.drafts.map((d) => (d.topic_title === draft.topic_title ? withImage : d)),
      }));
    } catch (e) {
      setError(`Failed to attach image: ${(e as Error).message}`);
    }
  }

  return (
    <div>
      {error && <ErrorBanner message={error} className="mb-2" />}
      <PostApprovalCard
        runId={runId}
        draft={draft}
        decision={decision === "skipped" ? undefined : decision}
        scheduledAt={scheduledAt}
        onApprove={handleApprove}
        onRevise={handleRevise}
        onSkip={handleSkip}
        onSchedule={handleSchedule}
        onAttachImage={handleAttachImage}
      />
    </div>
  );
}
