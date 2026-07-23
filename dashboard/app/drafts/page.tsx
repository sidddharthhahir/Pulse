import { listRuns } from "@/lib/runs";
import PerformanceForm from "@/components/PerformanceForm";
import AddToSamplesButton from "@/components/AddToSamplesButton";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const runs = await listRuns();
  const approved = runs.flatMap((run) =>
    run.drafts
      .filter((d) => run.decisions[d.topic_title]?.decision === "approved")
      .map((d) => ({ draft: d, run, result: run.publish_results[d.topic_title] }))
  );

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">Shipped &amp; approved</div>
      <h1 className="text-[38px] font-bold mb-6">Drafts</h1>
      {approved.length === 0 && <div className="dashed-empty">No drafts yet. Run the pipeline to generate some.</div>}
      <div className="space-y-5">
        {approved.map(({ draft, run, result }) => (
          <div key={`${run.id}-${draft.topic_title}`} className="panel px-8 py-7">
            <div className="flex items-baseline justify-between gap-4 mb-3.5">
              <span className="font-mono text-[12px] tracking-[0.08em] text-term-accent uppercase">{draft.pillar}</span>
              <span className="font-mono text-[12px] text-term-dim">{new Date(run.created_at).toLocaleString()}</span>
            </div>
            <div className="text-[21px] font-bold leading-[1.35] mb-4">{draft.topic_title}</div>
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-[1.75] text-term-body mb-5">
              {run.decisions[draft.topic_title]?.final_text ?? draft.text}
            </pre>
            <div className="flex items-center gap-5 flex-wrap mb-4">
              <AddToSamplesButton
                text={run.decisions[draft.topic_title]?.final_text ?? draft.text}
                performance={run.performance?.[draft.topic_title]}
              />
              {result && (
                <span className="font-mono text-[13px]">
                  {result.dry_run ? (
                    <span className="text-term-dim">Dry run — not published</span>
                  ) : (
                    <a href={result.url} target="_blank" rel="noreferrer">
                      Published: {result.url?.replace("https://www.", "").slice(0, 42)}···
                    </a>
                  )}
                </span>
              )}
            </div>
            {result && !result.dry_run && (
              <PerformanceForm runId={run.id} topicTitle={draft.topic_title} initial={run.performance?.[draft.topic_title]} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
