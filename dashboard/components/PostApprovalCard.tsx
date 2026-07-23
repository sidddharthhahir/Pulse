"use client";

import { useState } from "react";
import { Draft } from "@/lib/types";

export default function PostApprovalCard({
  draft,
  decision,
  scheduledAt,
  onApprove,
  onRevise,
  onSkip,
  onSchedule,
}: {
  draft: Draft;
  decision?: "approved" | "revised" | "skipped";
  scheduledAt?: string;
  onApprove: () => void;
  onRevise: (feedback: string) => Promise<void>;
  onSkip: () => void;
  onSchedule: (isoDateTime: string) => Promise<void>;
}) {
  const [revising, setRevising] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="panel px-8 py-7 space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[12px] tracking-[0.08em] text-term-accent uppercase">{draft.pillar}</span>
        <span className="font-mono text-[12px] text-term-dim">{draft.word_count} words</span>
      </div>
      <div className="text-[21px] font-bold leading-[1.35]">{draft.topic_title}</div>
      {draft.image_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={draft.image_path}
          alt="Generated visual for this post"
          className="w-full max-w-sm panel-outline"
        />
      )}
      {draft.source_url && (
        <div className="font-mono text-[12.5px] panel-outline px-3.5 py-2.5 text-term-dim">
          → link-preview card: <span className="text-term-accent">{draft.source_url}</span>
        </div>
      )}
      <pre className="whitespace-pre-wrap font-sans text-[15px] leading-[1.75] text-term-body">{draft.text}</pre>
      {localError && (
        <div className="font-mono text-[12.5px] px-3.5 py-2.5" style={{ border: "1px solid oklch(0.65 0.2 25 / 0.5)", color: "var(--danger)" }}>
          {localError}
        </div>
      )}

      {decision ? (
        <div className="font-mono text-[13.5px] text-term-accent">
          ✓ {decision}
          {scheduledAt && ` — scheduled for ${new Date(scheduledAt).toLocaleString()}`}
        </div>
      ) : scheduling ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="datetime-local"
            className="terminal-input !w-auto !p-2.5 text-sm"
            value={scheduleValue}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => setScheduleValue(e.target.value)}
          />
          <button
            className="btn-primary btn-sm"
            disabled={!scheduleValue || submitting}
            onClick={async () => {
              setSubmitting(true);
              setLocalError(null);
              try {
                await onSchedule(new Date(scheduleValue).toISOString());
                setScheduling(false);
              } catch (e) {
                setLocalError(`Couldn't schedule: ${(e as Error).message}`);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Scheduling..." : "Confirm schedule"}
          </button>
          <button className="btn-outline btn-sm" onClick={() => setScheduling(false)}>
            Cancel
          </button>
        </div>
      ) : revising ? (
        <div className="space-y-2.5">
          <textarea
            className="terminal-input !p-3 text-sm"
            rows={2}
            placeholder="What should change?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex gap-2.5">
            <button
              className="btn-primary btn-sm"
              disabled={!feedback.trim() || submitting}
              onClick={async () => {
                setSubmitting(true);
                setLocalError(null);
                try {
                  await onRevise(feedback);
                  setRevising(false);
                  setFeedback("");
                } catch (e) {
                  setLocalError(`Couldn't revise: ${(e as Error).message}`);
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Revising..." : "Submit revision"}
            </button>
            <button
              className="btn-outline btn-sm"
              onClick={() => {
                setRevising(false);
                setLocalError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5 flex-wrap">
          <button className="btn-primary btn-sm" onClick={onApprove}>
            Approve
          </button>
          <button className="btn-outline btn-sm" onClick={() => setRevising(true)}>
            Revise
          </button>
          <button className="btn-outline btn-sm" onClick={() => setScheduling(true)}>
            Schedule
          </button>
          <button className="btn-outline btn-sm" onClick={onSkip}>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
