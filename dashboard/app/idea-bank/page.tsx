import Link from "next/link";
import { listRuns } from "@/lib/runs";
import SkippedDraftCard from "@/components/SkippedDraftCard";

export const dynamic = "force-dynamic";

export default async function IdeaBankPage() {
  const runs = await listRuns();

  const discarded = runs.flatMap((run) =>
    run.ranked_topics
      .filter((t) => run.discarded_topics.includes(t.title))
      .map((t) => ({ topic: t, run }))
  );

  // Drafts that were actually written (real API spend) but skipped in
  // review — the content still exists and is still postable, so it belongs
  // here rather than disappearing once the run finished.
  const skipped = runs.flatMap((run) =>
    run.drafts
      .filter((d) => run.decisions[d.topic_title]?.decision === "skipped")
      .map((d) => ({ draft: d, run }))
  );

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">Backlog</div>
      <h1 className="text-[38px] font-bold mb-3">Idea Bank</h1>
      <p className="text-term-muted text-base mb-7">
        Nothing generated here gets thrown away — topics that surfaced but weren&apos;t picked, and drafts that were
        written but skipped, both stay available.
      </p>

      <h2 className="text-lg font-semibold mb-3">Drafted, not posted</h2>
      {skipped.length === 0 ? (
        <div className="dashed-empty mb-8">No skipped drafts — everything written so far was decided on.</div>
      ) : (
        <div className="space-y-5 mb-10">
          {skipped.map(({ draft, run }) => (
            <SkippedDraftCard key={`${run.id}-${draft.topic_title}`} runId={run.id} draft={draft} />
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Not yet researched</h2>
      {discarded.length === 0 && (
        <div className="dashed-empty">Nothing discarded — every topic from the last run made the cut.</div>
      )}
      <div className="space-y-3.5">
        {discarded.map(({ topic, run }) => (
          <div key={`${run.id}-${topic.title}`} className="panel-outline px-6 py-5">
            <div className="text-lg font-semibold leading-[1.4] mb-2.5">{topic.title}</div>
            <div className="font-mono text-[12px] text-term-dim mb-1.5">
              {topic.pillar} · {topic.source}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="font-mono text-[12px] text-term-faint">
                Discarded {new Date(run.created_at).toLocaleDateString()}
              </div>
              <Link href={`/pipeline?topic=${encodeURIComponent(JSON.stringify(topic))}`} className="btn-outline btn-sm shrink-0">
                Draft this →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
