import Link from "next/link";
import { listRuns } from "@/lib/runs";
import { listScheduled } from "@/lib/scheduled";
import { getCurrentMonthUsage, estimateCostUsd } from "@/lib/usage";
import { readKb, parsePillars } from "@/lib/knowledge-base";
import Sparkline from "@/components/Sparkline";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [runs, scheduled, usage, profile] = await Promise.all([
    listRuns(),
    listScheduled(),
    getCurrentMonthUsage(),
    readKb("profile"),
  ]);
  const latest = runs[0];

  const monthKey = new Date().toISOString().slice(0, 7);
  const postsThisMonth = runs
    .filter((r) => r.created_at.startsWith(monthKey))
    .reduce((n, r) => n + Object.values(r.publish_results).filter((p) => !p.dry_run).length, 0);

  // Pillar balance — every declared pillar starts at 0 so a pillar you
  // haven't touched this month is visible, not just absent from the list.
  const pillars = parsePillars(profile);
  const pillarCounts: Record<string, number> = Object.fromEntries(pillars.map((p) => [p, 0]));
  for (const run of runs) {
    if (!run.created_at.startsWith(monthKey)) continue;
    for (const draft of run.drafts) {
      const result = run.publish_results[draft.topic_title];
      if (!result || result.dry_run) continue;
      const matched = pillars.find((p) => p.toLowerCase() === draft.pillar.toLowerCase()) ?? draft.pillar;
      pillarCounts[matched] = (pillarCounts[matched] ?? 0) + 1;
    }
  }
  const maxPillarCount = Math.max(1, ...Object.values(pillarCounts));

  // Reactions over time, oldest → newest, for posts with logged performance
  const reactionSeries = [...runs]
    .reverse()
    .flatMap((r) => Object.values(r.performance ?? {}))
    .filter((p) => p.reactions != null)
    .map((p) => p.reactions!);
  const avgReactions =
    reactionSeries.length > 0 ? reactionSeries.reduce((a, b) => a + b, 0) / reactionSeries.length : null;

  const spend = usage ? estimateCostUsd(usage) : null;

  const nextScheduled = scheduled.find((p) => p.status === "pending");

  const draftsPerRun = [...runs]
    .reverse()
    .slice(-7)
    .map((r) => r.drafts.length);

  const approvedLatest = latest
    ? Object.values(latest.decisions).filter((d) => d.decision === "approved").length
    : 0;

  return (
    <div>
      <div className="eyebrow mb-2.5">System status</div>
      <h1 className="text-[38px] font-bold mb-2.5">Dashboard</h1>
      <p className="text-term-muted text-base mb-8">
        Your LinkedIn ghostwriter, running on <span className="font-mono text-[oklch(0.85_0.01_90)]">Claude Sonnet 5</span>.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        <div className="panel-outline px-6 py-5">
          <div className="mono-label mb-3">Posts this month</div>
          <div className="font-mono text-[28px] font-semibold">{postsThisMonth}</div>
          <div className="text-[13px] text-term-dim mt-1">published to LinkedIn</div>
        </div>

        <div className="panel-outline px-6 py-5">
          <div className="mono-label mb-3">Avg reactions</div>
          <div className="font-mono text-[28px] font-semibold">
            {avgReactions != null ? avgReactions.toFixed(0) : "—"}
          </div>
          <div className="mt-1">
            {reactionSeries.length > 1 ? (
              <Sparkline values={reactionSeries} height={26} />
            ) : (
              <div className="text-[13px] text-term-dim">log performance in Drafts</div>
            )}
          </div>
        </div>

        <div className="panel-outline px-6 py-5">
          <div className="mono-label mb-3">Est. API spend</div>
          <div className="font-mono text-[28px] font-semibold">
            {spend != null ? `$${spend.toFixed(2)}` : "$0.00"}
          </div>
          <div className="text-[13px] text-term-dim mt-1">
            {usage ? `${usage.calls} calls this month` : "tracked from now on"}
          </div>
        </div>

        <div className="panel-outline px-6 py-5">
          <div className="mono-label mb-3">Next scheduled</div>
          {nextScheduled ? (
            <>
              <div className="font-mono text-[15px] font-semibold leading-snug">
                {new Date(nextScheduled.scheduled_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-[13px] text-term-dim mt-1 truncate">{nextScheduled.topic_title}</div>
            </>
          ) : (
            <>
              <div className="font-mono text-[28px] font-semibold">—</div>
              <div className="text-[13px] text-term-dim mt-1">queue is empty</div>
            </>
          )}
        </div>
      </div>

      <div className="panel px-8 py-7 mb-7 relative overflow-hidden">
        <div className="mono-label mb-2">Last run</div>
        {latest ? (
          <>
            <div className="font-mono text-xl font-semibold mb-1.5">
              {new Date(latest.created_at).toLocaleString()}
            </div>
            <div className="text-[15px] text-[oklch(0.7_0.01_90)]">
              {latest.drafts.length} draft{latest.drafts.length === 1 ? "" : "s"} · {approvedLatest} approved
            </div>
          </>
        ) : (
          <div className="text-[15px] text-term-dim">No runs yet — start your first pipeline run.</div>
        )}
      </div>

      <div className="flex gap-3.5 mb-7">
        <Link href="/pipeline" className="btn-primary text-[15px] no-underline hover:no-underline" style={{ color: "var(--on-accent)" }}>
          Run pipeline
        </Link>
        <Link href="/knowledge" className="btn-outline text-[15px] no-underline hover:no-underline">
          Edit knowledge base
        </Link>
      </div>

      <div className="flex gap-3.5 flex-wrap">
        <div className="panel-outline px-7 py-6 max-w-[620px] flex-1 min-w-[280px]">
          <div className="mono-label mb-3.5">Drafts per run — last {draftsPerRun.length || 7}</div>
          <Sparkline values={draftsPerRun} />
        </div>

        {pillars.length > 0 && (
          <div className="panel-outline px-7 py-6 max-w-[620px] flex-1 min-w-[280px]">
            <div className="mono-label mb-3.5">Pillar balance — this month</div>
            <div className="space-y-2.5">
              {pillars.map((p) => {
                const count = pillarCounts[p] ?? 0;
                return (
                  <div key={p}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-[13px] text-term-body truncate">{p}</span>
                      <span className="font-mono text-[12px] text-term-dim shrink-0">{count}</span>
                    </div>
                    <div className="h-1.5 bg-[oklch(0.32_0.01_150_/_0.3)]">
                      <div
                        className="h-full"
                        style={{
                          width: `${(count / maxPillarCount) * 100}%`,
                          background: count === 0 ? "transparent" : "oklch(0.82 0.19 150 / 0.7)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
