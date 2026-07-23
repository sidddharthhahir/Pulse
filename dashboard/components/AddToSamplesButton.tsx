"use client";

import { useState } from "react";
import { PostPerformance } from "@/lib/types";

export default function AddToSamplesButton({ text, performance }: { text: string; performance?: PostPerformance }) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function add() {
    setState("saving");
    const performanceNote = performance
      ? [
          performance.impressions != null ? `${performance.impressions} impressions` : null,
          performance.reactions != null ? `${performance.reactions} reactions` : null,
          performance.comments != null ? `${performance.comments} comments` : null,
        ]
          .filter(Boolean)
          .join(", ")
      : undefined;

    try {
      const res = await fetch("/api/writing-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, performance_note: performanceNote }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <button className="btn-outline btn-sm" disabled={state === "saving" || state === "done"} onClick={add}>
      {state === "idle" && "Add to voice samples"}
      {state === "saving" && "Adding..."}
      {state === "done" && "✓ Added"}
      {state === "error" && "Failed — retry"}
    </button>
  );
}
