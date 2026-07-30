"use client";

import { useEffect, useState } from "react";
import { RankedTopic } from "@/lib/types";

// Above this, the cost estimate switches to a warning color — a nudge, not
// a hard block, since the user may have good reason to run a big batch.
const COST_WARNING_THRESHOLD_USD = 0.75;

export default function TopicChecklist({
  topics,
  onContinue,
}: {
  topics: RankedTopic[];
  onContinue: (selected: RankedTopic[], discarded: RankedTopic[]) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [perTopicCost, setPerTopicCost] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/cost-estimate")
      .then((r) => r.json())
      .then((d: { per_topic_usd: number }) => setPerTopicCost(d.per_topic_usd))
      .catch(() => {});
  }, []);

  const projectedCost = perTopicCost != null ? perTopicCost * checked.size : null;
  const overThreshold = projectedCost != null && projectedCost > COST_WARNING_THRESHOLD_USD;

  function toggle(title: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pick which topics to write this week</h2>
      <div className="space-y-2.5">
        {topics.map((t) => {
          const selected = checked.has(t.title);
          return (
            <label
              key={t.title}
              className="flex items-start gap-3.5 p-4 cursor-pointer transition-colors"
              style={{
                border: selected ? "1px solid oklch(0.82 0.19 150 / 0.6)" : "1px solid var(--border)",
                background: selected ? "oklch(0.82 0.19 150 / 0.05)" : "transparent",
              }}
            >
              <input type="checkbox" className="mt-1.5 accent-[oklch(0.82_0.19_150)]" checked={selected} onChange={() => toggle(t.title)} />
              <div className="min-w-0">
                <div className="font-medium text-[15px] leading-snug">
                  <span className="font-mono text-term-accent mr-2">#{t.rank}</span>
                  {t.title}
                  {t.format === "hot-topic" && (
                    <span
                      className="ml-2 font-mono text-[10.5px] tracking-[0.06em] px-2 py-0.5 align-middle"
                      style={{ border: "1px solid oklch(0.78 0.16 85 / 0.5)", color: "var(--warn)" }}
                    >
                      HOT TOPIC
                    </span>
                  )}
                  {t.format === "expose" && (
                    <span
                      className="ml-2 font-mono text-[10.5px] tracking-[0.06em] px-2 py-0.5 align-middle"
                      style={{ border: "1px solid oklch(0.7 0.19 25 / 0.5)", color: "oklch(0.7 0.19 25)" }}
                    >
                      EXPOSÉ
                    </span>
                  )}
                  {t.format === "listicle" && (
                    <span
                      className="ml-2 font-mono text-[10.5px] tracking-[0.06em] px-2 py-0.5 align-middle"
                      style={{ border: "1px solid oklch(0.82 0.19 150 / 0.5)", color: "var(--accent)" }}
                    >
                      LISTICLE
                    </span>
                  )}
                </div>
                <div className="font-mono text-[12px] text-term-dim mt-1">
                  {t.pillar} · {t.source}
                </div>
                <div className="text-[14px] text-term-body mt-1.5">{t.angle}</div>
                <div className="text-[12.5px] text-term-faint mt-1">Why now: {t.why_now}</div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-3.5 flex-wrap">
        <button
          className="btn-primary text-[15px]"
          disabled={checked.size === 0}
          onClick={() => {
            const selected = topics.filter((t) => checked.has(t.title));
            const discarded = topics.filter((t) => !checked.has(t.title));
            onContinue(selected, discarded);
          }}
        >
          Continue with {checked.size} topic{checked.size === 1 ? "" : "s"}
        </button>
        {projectedCost != null && checked.size > 0 && (
          <span
            className="font-mono text-[12.5px]"
            style={{ color: overThreshold ? "var(--warn)" : "var(--muted)" }}
          >
            {overThreshold ? "⚠ " : ""}
            estimated cost: ~${projectedCost.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
