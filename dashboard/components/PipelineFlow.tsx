"use client";

export type StageStatus = "idle" | "running" | "done" | "error";

export interface FlowStage {
  key: string;
  label: string;
  sublabel: string;
  status: StageStatus;
}

// Connected-node flow diagram for the pipeline — each stage is a node with a
// status dot and its agents named underneath; connectors light up as stages
// complete. Replaces the old generic pill stepper.
export default function PipelineFlow({ stages }: { stages: FlowStage[] }) {
  return (
    <div className="flex items-start mb-9 max-w-[860px]">
      {stages.map((stage, i) => {
        const done = stage.status === "done";
        const running = stage.status === "running";
        const error = stage.status === "error";
        const prevDone = i > 0 && stages[i - 1].status === "done";

        return (
          <div key={stage.key} className="flex items-start flex-1 min-w-0 first:flex-none">
            {i > 0 && (
              <div
                className="h-px flex-1 mt-[9px] mx-2 transition-colors duration-500"
                style={{
                  background: prevDone ? "oklch(0.82 0.19 150 / 0.7)" : "oklch(0.32 0.01 150 / 0.4)",
                }}
              />
            )}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className="w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all duration-300"
                style={{
                  borderColor: error
                    ? "var(--danger)"
                    : done || running
                      ? "oklch(0.82 0.19 150 / 0.8)"
                      : "oklch(0.4 0.01 90 / 0.5)",
                  background: done ? "oklch(0.82 0.19 150)" : "transparent",
                  animation: running ? "nodePulse 1.2s ease-in-out infinite" : undefined,
                }}
              >
                {done && (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M2 5.2 L4.2 7.4 L8 2.8" fill="none" stroke="oklch(0.14 0.01 150)" strokeWidth="1.6" />
                  </svg>
                )}
                {running && <div className="w-[7px] h-[7px] rounded-full bg-term-accent" />}
                {error && <div className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--danger)" }} />}
              </div>
              <div className="text-center">
                <div
                  className={`text-[13.5px] font-medium whitespace-nowrap ${
                    done || running ? "text-term-text" : "text-term-dim"
                  }`}
                >
                  {stage.label}
                </div>
                <div className="font-mono text-[10.5px] text-term-faint tracking-[0.04em] whitespace-nowrap mt-0.5">
                  {stage.sublabel}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
