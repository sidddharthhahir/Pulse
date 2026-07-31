import { RunRecord } from "./types";

// Read-modify-write against the run store, with one retry if another tab or
// request saved a newer version in between the read and the write (409 from
// /api/runs). Used by anything that mutates a run outside the pipeline
// page's own continuous in-memory session — e.g. a Drafts-page action on a
// run that finished a while ago.
export async function mutateRun(runId: string, mutate: (run: RunRecord) => RunRecord): Promise<RunRecord> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("/api/runs");
    if (!res.ok) throw new Error("Couldn't load runs");
    const data = (await res.json()) as { runs: RunRecord[] };
    const run = data.runs.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found");

    const next = mutate(run);
    const saveRes = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...next, expected_updated_at: run.updated_at }),
    });
    if (saveRes.ok) return next;
    if (saveRes.status === 409 && attempt === 0) continue;

    const err = await saveRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save run");
  }
  throw new Error("Run was modified elsewhere — please retry");
}
