"use client";

import { useMemo } from "react";
import { analyzeVoice, extractSampleBodies } from "@/lib/voice-dna";

export default function VoiceDNA({ rawContent }: { rawContent: string }) {
  const dna = useMemo(() => analyzeVoice(extractSampleBodies(rawContent)), [rawContent]);

  if (!dna) {
    return (
      <div className="panel-outline px-6 py-5 mt-6">
        <div className="mono-label mb-2">Voice DNA</div>
        <div className="text-[13px] text-term-dim">
          No pasted samples yet — once you add real posts above (via <code>/add-writing-sample</code> or pasting them in),
          this fingerprints your actual writing habits: sentence length, favorite words, emoji and formatting tics.
        </div>
      </div>
    );
  }

  const stats: { label: string; value: string }[] = [
    { label: "Avg words / post", value: String(dna.avgWordsPerPost) },
    { label: "Avg sentence length", value: `${dna.avgSentenceLength} words` },
    { label: "Em dashes / post", value: String(dna.emDashPerPost) },
    { label: "Arrow lists (→) / post", value: String(dna.arrowListPerPost) },
    { label: "Emoji / post", value: String(dna.emojiPerPost) },
    { label: "Hashtags / post", value: String(dna.avgHashtags) },
    { label: "Posts ending on a question", value: `${dna.questionPostRate}%` },
  ];

  return (
    <div className="panel-outline px-6 py-5 mt-6">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div className="mono-label">Voice DNA</div>
        <div className="font-mono text-[11px] text-term-faint">
          based on {dna.sampleCount} sample{dna.sampleCount === 1 ? "" : "s"}
          {dna.sampleCount < 3 ? " — add more for a sharper picture" : ""}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 mb-5">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-mono text-[19px] font-semibold text-term-text">{s.value}</div>
            <div className="text-[12px] text-term-dim mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {dna.topWords.length > 0 && (
        <div>
          <div className="text-[12px] text-term-dim mb-2">Your most-used words</div>
          <div className="flex flex-wrap gap-2">
            {dna.topWords.map((w) => (
              <span
                key={w.word}
                className="font-mono text-[12px] px-2.5 py-1 rounded-full text-term-body"
                style={{ border: "1px solid oklch(0.4 0.01 90 / 0.4)" }}
              >
                {w.word} <span className="text-term-faint">×{w.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
