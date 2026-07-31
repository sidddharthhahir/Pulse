"use client";

import { useState } from "react";
import { PostPerformance } from "@/lib/types";

const FIELDS = ["impressions", "reactions", "comments"] as const;

export default function PerformanceForm({
  runId,
  topicTitle,
  initial,
}: {
  runId: string;
  topicTitle: string;
  initial?: PostPerformance;
}) {
  const [values, setValues] = useState<Record<(typeof FIELDS)[number], string>>({
    impressions: initial?.impressions?.toString() ?? "",
    reactions: initial?.reactions?.toString() ?? "",
    comments: initial?.comments?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          topic_title: topicTitle,
          impressions: values.impressions ? Number(values.impressions) : undefined,
          reactions: values.reactions ? Number(values.reactions) : undefined,
          comments: values.comments ? Number(values.comments) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError("Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="mono-label">Performance</span>
      {FIELDS.map((field) => (
        <input
          key={field}
          type="number"
          placeholder={field}
          aria-label={`${field} for "${topicTitle}"`}
          className="w-28 font-mono text-[12px] px-3 py-2 bg-transparent text-term-text"
          style={{ border: "1px solid var(--border)" }}
          value={values[field]}
          onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
        />
      ))}
      <button className="btn-outline btn-sm font-mono !text-[12px] !py-2" disabled={saving} onClick={save}>
        {saving ? "Saving..." : saved ? "✓ Saved" : "Log"}
      </button>
      {error && <span className="font-mono text-[12px]" style={{ color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}
