"use client";

import { useEffect, useRef } from "react";

export interface LogEntry {
  id: string;
  time: string;
  text: string;
  kind: "info" | "success" | "error";
}

const DOT_COLOR: Record<LogEntry["kind"], string> = {
  info: "oklch(0.6 0.01 90)",
  success: "oklch(0.82 0.19 150)",
  error: "var(--danger)",
};

// Live scrolling feed of what the pipeline is actually doing right now —
// which stage started, what it found, what it wrote — so a run isn't just
// four silent status dots. Persists for the whole run, not just the current
// phase, so you can scroll back and see the full trace after it finishes.
export default function ActivityLog({ entries }: { entries: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div className="panel-outline mb-6 animate-phase-in">
      <div className="eyebrow px-4 pt-3 pb-2">Live activity</div>
      <div className="max-h-[240px] overflow-y-auto px-4 pb-3 space-y-1.5 font-mono text-[12.5px]">
        {entries.map((e) => (
          <div key={e.id} className="flex items-start gap-2.5">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[5px]" style={{ background: DOT_COLOR[e.kind] }} />
            <span className="shrink-0 text-term-faint">{e.time}</span>
            <span className={e.kind === "error" ? "text-term-body" : "text-term-dim"} style={e.kind === "error" ? { color: "var(--danger)" } : undefined}>
              {e.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
