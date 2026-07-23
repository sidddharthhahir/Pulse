"use client";

import { useEffect, useState } from "react";

// After this long with no progress, show a reassurance line — a stage stuck
// on a slow or rate-limited API call otherwise looks identical to a frozen one.
const LONG_WAIT_MS = 20000;

// The literal "pulse" loading state: an ECG-style line that draws itself in a
// loop while a pipeline stage is working, with a mono status label underneath.
// Parents remount this per stage (via a `key`), so the reassurance timer
// resets automatically on every new stage.
export default function PulseLine({ label }: { label: string }) {
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="animate-phase-in max-w-[640px]">
      <svg width="100%" height="56" viewBox="0 0 480 56" preserveAspectRatio="none" aria-hidden>
        <polyline
          points="0,28 120,28 150,28 165,10 180,46 195,20 210,28 340,28 360,28 375,14 390,42 405,28 480,28"
          fill="none"
          stroke="oklch(0.82 0.19 150)"
          strokeWidth="2"
          strokeDasharray="480"
          style={{ animation: "ecgDash 1.6s linear infinite", filter: "drop-shadow(0 0 4px oklch(0.82 0.19 150 / 0.6))" }}
        />
      </svg>
      <div className="font-mono text-[13px] text-term-dim mt-2 tracking-[0.06em]">{label}</div>
      {longWait && (
        <div className="font-mono text-[12px] text-term-faint mt-1.5 tracking-[0.04em] animate-phase-in">
          Still working — this can take a couple minutes if the API is rate-limited or under load.
        </div>
      )}
    </div>
  );
}
