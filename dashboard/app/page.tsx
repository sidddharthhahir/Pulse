import fs from "fs";
import dotenv from "dotenv";
import Link from "next/link";
import { listRuns } from "@/lib/runs";
import { listScheduled } from "@/lib/scheduled";
import { getCurrentMonthUsage, estimateCostUsd } from "@/lib/usage";
import { readKb, parsePillars } from "@/lib/knowledge-base";
import { getTokenMeta, daysRemaining } from "@/lib/linkedin-token";
import { getBestPostingTime } from "@/lib/analytics";
import { ENV_PATH } from "@/lib/paths";
import Sparkline from "@/components/Sparkline";

export const dynamic = "force-dynamic";

function daysAgoLabel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default async function DashboardPage() {
  if (fs.existsSync(ENV_PATH)) {
    dotenv.config({ path: ENV_PATH });
  }
  const hasLinkedIn = Boolean(process.env.LINKEDIN_ACCESS_TOKEN);

  const [runs, scheduled, usage, profile, tokenMeta, bestTime] = await Promise.all([
    listRuns(),
    listScheduled(),
    getCurrentMonthUsage(),
    readKb("profile"),
    hasLinkedIn ? getTokenMeta() : Promise.resolve(null),
    getBestPostingTime(),
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

  // Approximate last-published timestamp — real publish_results/ScheduledPost
  // don't carry a dedicated timestamp, so this uses the run's updated_at
  // (set right after a live publish) and, for the scheduler, scheduled_at
  // (fires within ~15 min of that time).
  const publishTimestamps: number[] = [];
  for (const run of runs) {
    if (Object.values(run.publish_results).some((p) => !p.dry_run)) {
      publishTimestamps.push(new Date(run.updated_at).getTime());
    }
  }
  for (const post of scheduled) {
    if (post.status === "published" && !post.publish_result?.dry_run) {
      publishTimestamps.push(new Date(post.scheduled_at).getTime());
    }
  }
  const lastPublishedAt = publishTimestamps.length ? Math.max(...publishTimestamps) : null;

  // Idea Bank backlog — everything generated but not yet used, so the
  // dashboard makes that backlog visible instead of it living only on
  // the Idea Bank page.
  const discardedCount = runs.reduce((n, r) => n + r.discarded_topics.length, 0);
  const skippedDraftsCount = runs.reduce(
    (n, r) => n + r.drafts.filter((d) => r.decisions[d.topic_title]?.decision === "skipped").length,
    0
  );

  const tokenDaysLeft = tokenMeta ? daysRemaining(tokenMeta) : null;
  const tokenExpiringSoon = tokenDaysLeft !== null && tokenDaysLeft <= 7;

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">System status</div>
      <h1 className="text-[38px] font-bold mb-2.5">Dashboard</h1>
      <p className="text-term-muted text-base mb-6">
        Your LinkedIn ghostwriter, running on <span className="font-mono text-[oklch(0.85_0.01_90)]">Claude Sonnet 5</span>.
      </p>

      {tokenExpiringSoon && (
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-4 py-3 mb-6 no-underline hover:no-underline transition-colors"
          style={{ border: "1px solid oklch(0.65 0.2 25 / 0.5)", background: "oklch(0.65 0.2 25 / 0.06)" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: "var(--danger)", boxShadow: "0 0 8px oklch(0.65 0.2 25 / 0.7)" }}
          />
          <span className="text-[13.5px]" style={{ color: "var(--danger)" }}>
            LinkedIn token expires in {tokenDaysLeft} day{tokenDaysLeft === 1 ? "" : "s"} — refresh it in Settings before publishing breaks.
          </span>
        </Link>
      )}
      {!hasLinkedIn && (
        <div className="flex items-center gap-2.5 px-4 py-3 mb-6" style={{ border: "1px solid var(--border)" }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--warn)" }} />
          <span className="text-[13.5px] text-term-dim">
            Dry-run mode — LinkedIn isn&apos;t connected, so nothing actually publishes yet.{" "}
            <Link href="/settings">Connect it in Settings</Link>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        <Link
          href="/drafts"
          className="panel-outline px-6 py-5 no-underline hover:no-underline transition-colors block"
        >
          <div className="mono-label mb-3">Posts this month</div>
          <div className="font-mono text-[28px] font-semibold text-term-text">{postsThisMonth}</div>
          <div className="text-[13px] text-term-dim mt-1">
            {lastPublishedAt != null ? `last published ${daysAgoLabel(lastPublishedAt)}` : "published to LinkedIn"}
          </div>
        </Link>

        <div className="panel-outline px-6 py-5">
          <div className="mono-label mb-3">Avg reactions</div>
          <div className="font-mono text-[28px] font-semibold text-term-text">
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
          <div className="font-mono text-[28px] font-semibold text-term-text">
            {spend != null ? `$${spend.toFixed(2)}` : "$0.00"}
          </div>
          <div className="text-[13px] text-term-dim mt-1">
            {usage ? `${usage.calls} calls this month` : "tracked from now on"}
          </div>
        </div>

        <Link
          href="/scheduled"
          className="panel-outline px-6 py-5 no-underline hover:no-underline transition-colors block"
        >
          <div className="mono-label mb-3">Next scheduled</div>
          {nextScheduled ? (
            <>
              <div className="font-mono text-[15px] font-semibold leading-snug text-term-text">
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
              <div className="font-mono text-[28px] font-semibold text-term-text">—</div>
              <div className="text-[13px] text-term-dim mt-1">queue is empty</div>
            </>
          )}
        </Link>
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
          <div className="text-[15px] text-term-dim">
            No runs yet — open <Link href="/pipeline">Pipeline</Link> in the sidebar to create your first batch of posts.
          </div>
        )}
      </div>

      <div className="flex gap-3.5 flex-wrap">
        <div className="panel-outline px-7 py-6 flex-1 min-w-[240px]">
          <div className="mono-label mb-3.5">Drafts per run — last {draftsPerRun.length || 7}</div>
          <Sparkline values={draftsPerRun} />
        </div>

        {pillars.length > 0 && (
          <div className="panel-outline px-7 py-6 flex-1 min-w-[240px]">
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

        <Link
          href="/idea-bank"
          className="panel-outline px-7 py-6 flex-1 min-w-[240px] no-underline hover:no-underline transition-colors block"
        >
          <div className="mono-label mb-3.5">Idea Bank backlog</div>
          {discardedCount === 0 && skippedDraftsCount === 0 ? (
            <div className="text-[13px] text-term-dim">Nothing waiting — every topic and draft was decided on.</div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-term-body">Topics not yet researched</span>
                <span className="font-mono text-[15px] font-semibold text-term-text">{discardedCount}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-term-body">Drafts written, skipped</span>
                <span className="font-mono text-[15px] font-semibold text-term-text">{skippedDraftsCount}</span>
              </div>
            </div>
          )}
        </Link>

        <div className="panel-outline px-7 py-6 flex-1 min-w-[240px]">
          <div className="mono-label mb-3.5">Best posting time — early signal</div>
          {bestTime.active && bestTime.best ? (
            <>
              <div className="font-mono text-[19px] font-semibold text-term-text">
                {bestTime.best.dayOfWeek}s, ~{bestTime.best.hour}
              </div>
              <div className="text-[13px] text-term-dim mt-1">
                Your top post so far went out then — {bestTime.best.impressions} impressions. Based on {bestTime.count} tracked post{bestTime.count === 1 ? "" : "s"}, not a full model yet.
              </div>
            </>
          ) : (
            <div className="text-[13px] text-term-dim">
              Log performance on {3 - bestTime.count} more post{3 - bestTime.count === 1 ? "" : "s"} to unlock this — needs at least 3 tracked publishes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
