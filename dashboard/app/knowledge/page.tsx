"use client";

import { useEffect, useState } from "react";
import MarkdownField from "@/components/MarkdownField";
import VoiceDNA from "@/components/VoiceDNA";
import { KbSection } from "@/lib/paths";

const TABS: { key: KbSection; label: string }[] = [
  { key: "profile", label: "Core profile" },
  { key: "content_rules", label: "Content rules" },
  { key: "writing_samples", label: "Voice & tone" },
  { key: "high_performing_posts", label: "Inspiration posts" },
];

export default function KnowledgePage() {
  const [tab, setTab] = useState<KbSection>("profile");
  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setContent(null);
    setLoadError(null);
    fetch(`/api/knowledge/${tab}`)
      .then((r) => r.json())
      .then((d) => setContent(d.content))
      .catch(() => setLoadError("Couldn't load this section — try switching tabs again."));
  }, [tab]);

  async function save(value: string) {
    const res = await fetch(`/api/knowledge/${tab}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Save failed");
    }
    // Update the baseline so MarkdownField stops showing unsaved changes.
    setContent(value);
  }

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">Train the system</div>
      <h1 className="text-[38px] font-bold mb-2">Knowledge</h1>
      <p className="text-term-muted text-[15px] mb-6">
        Voice, rules and inspiration — keep it sharp. Edits apply to the next pipeline run.
      </p>
      <div className="flex gap-2.5 mb-6 flex-wrap">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="text-[14px] font-semibold px-4.5 py-2 rounded-full cursor-pointer"
              style={{
                padding: "9px 18px",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--on-accent)" : "var(--muted)",
                border: active ? "1px solid transparent" : "1px solid oklch(0.4 0.01 90 / 0.4)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {loadError ? (
        <div className="font-mono text-sm" style={{ color: "var(--danger)" }}>{loadError}</div>
      ) : content === null ? (
        <div className="font-mono text-sm text-term-dim">Loading...</div>
      ) : (
        <div key={tab} className="animate-phase-in">
          <MarkdownField label={TABS.find((t) => t.key === tab)!.label} initialValue={content} onSave={save} />
          {tab === "writing_samples" && <VoiceDNA rawContent={content} />}
        </div>
      )}
    </div>
  );
}
