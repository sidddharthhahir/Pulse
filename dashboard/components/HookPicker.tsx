"use client";

import { useState } from "react";
import { TopicHooks } from "@/lib/types";

export default function HookPicker({
  topicHooks,
  onContinue,
}: {
  topicHooks: TopicHooks[];
  onContinue: (selectedHooks: Record<string, string>) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>({});

  const allPicked = topicHooks.every((th) => picked[th.topic_title]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Pick a hook for each topic</h2>
      {topicHooks.map((th) => (
        <div key={th.topic_title} className="panel-outline p-5">
          <div className="font-medium text-[15px] mb-3">{th.topic_title}</div>
          <div className="space-y-2">
            {th.hooks.map((h) => {
              const selected = picked[th.topic_title] === h.text;
              return (
                <label
                  key={h.type}
                  className="flex items-start gap-2.5 text-sm cursor-pointer p-2.5 transition-colors"
                  style={{
                    border: selected ? "1px solid oklch(0.82 0.19 150 / 0.5)" : "1px solid transparent",
                    background: selected ? "oklch(0.82 0.19 150 / 0.05)" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    className="mt-1 accent-[oklch(0.82_0.19_150)]"
                    name={th.topic_title}
                    checked={selected}
                    onChange={() => setPicked((prev) => ({ ...prev, [th.topic_title]: h.text }))}
                  />
                  <span className="text-term-body">
                    <span className="font-mono text-[11px] tracking-[0.06em] text-term-dim uppercase mr-2">[{h.type}]</span>
                    &quot;{h.text}&quot;
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <button className="btn-primary text-[15px]" disabled={!allPicked} onClick={() => onContinue(picked)}>
        Write drafts
      </button>
    </div>
  );
}
