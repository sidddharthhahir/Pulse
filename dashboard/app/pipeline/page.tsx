"use client";

import { useEffect, useRef, useState } from "react";
import PipelineFlow, { FlowStage } from "@/components/PipelineFlow";
import PulseLine from "@/components/PulseLine";
import ActivityLog, { LogEntry } from "@/components/ActivityLog";
import TopicChecklist from "@/components/TopicChecklist";
import HookPicker from "@/components/HookPicker";
import PostApprovalCard from "@/components/PostApprovalCard";
import ErrorBanner from "@/components/ErrorBanner";
import { Draft, RankedTopic, ResearchBrief, RunRecord, Topic, TopicHooks } from "@/lib/types";

function newRun(): RunRecord {
  const now = new Date().toISOString();
  return {
    id: `run_${Date.now()}`,
    created_at: now,
    updated_at: now,
    status: "in_progress",
    ranked_topics: [],
    selected_topics: [],
    discarded_topics: [],
    research_briefs: [],
    hooks: [],
    selected_hooks: {},
    drafts: [],
    decisions: {},
    publish_results: {},
    performance: {},
  };
}

// Which phase an in-progress run should resume into, based on how far it got.
function phaseForRun(r: RunRecord): Phase | null {
  if (r.drafts.length > 0) return "review";
  if (r.hooks.length > 0) return "hooks";
  if (r.ranked_topics.length > 0) return "topics";
  return null; // nothing meaningful saved yet — not worth resuming
}

type Phase = "ideas" | "researching" | "topics" | "developing" | "hooks" | "writing" | "review" | "done";

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request to ${url} failed`);
  return data as T;
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

function persistRun(r: RunRecord) {
  // Fire-and-forget — save progress after every stage so a closed tab or
  // crash doesn't lose work. Errors here shouldn't block the UI.
  postJson("/api/runs", r).catch(() => {});
}

export default function PipelinePage() {
  const [phase, setPhase] = useState<Phase>("ideas");
  const [ideasInput, setIdeasInput] = useState("");
  const [run, setRun] = useState<RunRecord>(() => newRun());
  const [error, setError] = useState<string | null>(null);

  const [briefs, setBriefs] = useState<Record<string, ResearchBrief>>({});
  const [hooksByTopic, setHooksByTopic] = useState<TopicHooks[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [resumable, setResumable] = useState<RunRecord | null>(null);
  const [checkedResume, setCheckedResume] = useState(false);
  const [finalCost, setFinalCost] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  function cancelInFlight() {
    abortRef.current?.abort();
  }

  const [log, setLog] = useState<LogEntry[]>([]);
  function pushLog(text: string, kind: LogEntry["kind"] = "info") {
    setLog((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, time: new Date().toLocaleTimeString(), text, kind }]);
  }

  // Best-effort — logs what this specific run has cost so far, using the
  // per-run usage lib/usage.ts started tracking alongside the monthly total.
  async function logRunCost() {
    try {
      const { cost_usd } = await fetch(`/api/run-usage/${run.id}`).then((r) => r.json());
      pushLog(`Run cost so far: $${cost_usd.toFixed(2)}`);
    } catch {
      // non-fatal — cost display is a nice-to-have, never blocks the run
    }
  }

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d: { runs: RunRecord[] }) => {
        const candidate = d.runs.find((r) => r.status === "in_progress" && phaseForRun(r));
        if (candidate) setResumable(candidate);
      })
      .catch(() => {})
      .finally(() => setCheckedResume(true));
  }, []);

  // Land here from Idea Bank's "Draft this" link — seeds a single discarded
  // topic straight into the develop/write stages, skipping topic selection.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicParam = params.get("topic");
    if (!topicParam) return;
    window.history.replaceState({}, "", "/pipeline");
    try {
      const topic = JSON.parse(topicParam) as RankedTopic;
      pushLog(`Picked up from Idea Bank: "${topic.title}"`);
      onTopicsChosen([topic], []);
    } catch {
      setError("Couldn't load that idea — the link may be malformed.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resume(r: RunRecord) {
    const target = phaseForRun(r);
    if (!target) return;
    setRun(r);
    setBriefs(Object.fromEntries(r.research_briefs.map((b) => [b.topic_title, b])));
    setHooksByTopic(r.hooks);
    setDrafts(r.drafts);
    setPhase(target);
    setResumable(null);
  }

  async function discardResumable(r: RunRecord) {
    try {
      await postJson("/api/runs", { ...r, status: "completed" });
    } catch {
      // best-effort — even if this fails, hide the banner so it's not stuck nagging
    }
    setResumable(null);
  }

  const stages: FlowStage[] = [
    { key: "discover", label: "Discover", sublabel: "researcher · ranker", status: phase === "researching" ? "running" : ["topics", "developing", "hooks", "writing", "review", "done"].includes(phase) ? "done" : "idle" },
    { key: "develop", label: "Develop", sublabel: "deep-research · hooks", status: phase === "developing" ? "running" : ["hooks", "writing", "review", "done"].includes(phase) ? "done" : "idle" },
    { key: "write", label: "Write", sublabel: "writer · editor", status: phase === "writing" ? "running" : ["review", "done"].includes(phase) ? "done" : "idle" },
    { key: "ship", label: "Ship & Learn", sublabel: "publisher · strategy", status: phase === "review" ? "running" : phase === "done" ? "done" : "idle" },
  ];

  async function startResearch() {
    setError(null);
    setPhase("researching");
    pushLog("Researcher: scanning the web for trending topics against your pillars...");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const ideas = ideasInput.split("\n").map((s) => s.trim()).filter(Boolean);
      if (ideas.length) pushLog(`Carrying forward ${ideas.length} idea(s) you typed in`);
      const research = await postJson<{ topics: Topic[] }>("/api/research", { run_id: run.id }, controller.signal);
      pushLog(`Researcher: found ${research.topics.length} topics`, "success");
      pushLog("Ranker: scoring against pillar fit, story potential, and past performance...");
      const ranked = await postJson<{ ranked_topics: RankedTopic[] }>(
        "/api/rank",
        { topics: research.topics, ideas, run_id: run.id },
        controller.signal
      );
      pushLog(`Ranker: shortlisted top ${ranked.ranked_topics.length}`, "success");
      const next = { ...run, ranked_topics: ranked.ranked_topics };
      setRun(next);
      persistRun(next);
      setPhase("topics");
    } catch (e) {
      if (isAbortError(e)) {
        pushLog("Discover stage cancelled.");
        setPhase("ideas");
        return;
      }
      pushLog(`Discover stage failed: ${(e as Error).message}`, "error");
      setError((e as Error).message);
      setPhase("ideas");
    } finally {
      abortRef.current = null;
    }
  }

  async function onTopicsChosen(selected: RankedTopic[], discarded: RankedTopic[]) {
    setError(null);
    setPhase("developing");
    // Merge in any topics not already tracked on this run — covers the
    // Idea Bank "Draft this" path, which seeds a single topic that never
    // went through /api/research or /api/rank.
    const existingTitles = new Set(run.ranked_topics.map((t) => t.title));
    const newlyAdded = [...selected, ...discarded].filter((t) => !existingTitles.has(t.title));
    const withTopics = {
      ...run,
      ranked_topics: newlyAdded.length ? [...run.ranked_topics, ...newlyAdded] : run.ranked_topics,
      selected_topics: selected.map((t) => t.title),
      discarded_topics: discarded.map((t) => t.title),
    };
    setRun(withTopics);

    const controller = new AbortController();
    abortRef.current = controller;

    // Promise.allSettled (not .all): one topic failing shouldn't throw away
    // the API spend already made on the others.
    const settled = await Promise.allSettled(
      selected.map(async (topic) => {
        pushLog(`Deep-research: "${topic.title}"...`);
        const brief = await postJson<ResearchBrief>("/api/deep-research", { topic, run_id: run.id }, controller.signal);
        pushLog(`Deep-research: "${topic.title}" — found ${brief.stats.length} stats, ${brief.examples.length} examples`, "success");
        pushLog(`Hook factory: "${topic.title}"...`);
        const hooks = await postJson<TopicHooks>("/api/hooks", { topic, brief, run_id: run.id }, controller.signal);
        pushLog(`Hook factory: "${topic.title}" — ${hooks.hooks.length} hook options ready`, "success");
        return { topic, brief, hooks };
      })
    );
    abortRef.current = null;

    if (controller.signal.aborted) {
      pushLog("Develop stage cancelled.");
      setPhase("topics");
      return;
    }

    const newBriefs: Record<string, ResearchBrief> = {};
    const newHooks: TopicHooks[] = [];
    const succeededTopics: RankedTopic[] = [];
    const failedTitles: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") {
        newBriefs[r.value.topic.title] = r.value.brief;
        newHooks.push(r.value.hooks);
        succeededTopics.push(selected[i]);
      } else {
        failedTitles.push(selected[i].title);
        pushLog(`"${selected[i].title}" — develop stage failed: ${(r.reason as Error).message}`, "error");
      }
    });

    if (succeededTopics.length === 0) {
      setError("Research/hooks failed for every topic — try again.");
      setPhase("topics");
      return;
    }

    setBriefs(newBriefs);
    setHooksByTopic(newHooks);
    const next = {
      ...withTopics,
      selected_topics: succeededTopics.map((t) => t.title),
      research_briefs: Object.values(newBriefs),
      hooks: newHooks,
    };
    setRun(next);
    persistRun(next);
    if (failedTitles.length > 0) {
      setError(`Skipped ${failedTitles.length} topic(s) that failed: ${failedTitles.join(", ")}. Continuing with the rest.`);
    }
    setPhase("hooks");
  }

  async function onHooksChosen(selectedHooks: Record<string, string>) {
    setError(null);
    setPhase("writing");
    const withHooks = { ...run, selected_hooks: selectedHooks };
    setRun(withHooks);

    const selected = run.ranked_topics.filter((t) => run.selected_topics.includes(t.title));
    const controller = new AbortController();
    abortRef.current = controller;
    const settled = await Promise.allSettled(
      selected.map(async (topic) => {
        pushLog(`Writer: drafting "${topic.title}"...`);
        const draft = await postJson<Draft>(
          "/api/write",
          { topic, brief: briefs[topic.title], hook: selectedHooks[topic.title], run_id: run.id },
          controller.signal
        );
        pushLog(`Writer: "${topic.title}" — ${draft.word_count} words, handing to style editor`);
        const edited = await postJson<Draft>("/api/edit", { draft, run_id: run.id }, controller.signal);
        pushLog(`Style editor: "${topic.title}" — polished (${edited.word_count} words)`, "success");
        if (topic.format === "hot-topic") {
          // Hot-topic/news posts get a native LinkedIn link-preview card.
          return { ...edited, source_url: briefs[topic.title]?.source_url };
        }
        return edited;
      })
    );
    abortRef.current = null;

    if (controller.signal.aborted) {
      pushLog("Write stage cancelled.");
      setPhase("hooks");
      return;
    }

    const newDrafts: Draft[] = [];
    const failedTitles: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") newDrafts.push(r.value);
      else {
        failedTitles.push(selected[i].title);
        pushLog(`"${selected[i].title}" — write stage failed: ${(r.reason as Error).message}`, "error");
      }
    });

    if (newDrafts.length === 0) {
      setError("Writing failed for every topic — try again.");
      setPhase("hooks");
      return;
    }

    setDrafts(newDrafts);
    const next = { ...withHooks, drafts: newDrafts };
    setRun(next);
    persistRun(next);
    if (failedTitles.length > 0) {
      setError(`Skipped ${failedTitles.length} topic(s) that failed to draft: ${failedTitles.join(", ")}.`);
    }
    await logRunCost();
    setPhase("review");
  }

  async function decide(topicTitle: string, decision: "approved" | "revised" | "skipped", finalText?: string) {
    if (decision === "approved") {
      // Publish first — only record the decision as "approved" once we know
      // it actually went out. Otherwise a failed publish would still show a
      // misleading "✓ approved" with nothing actually posted.
      const draft = drafts.find((d) => d.topic_title === topicTitle)!;
      pushLog(`Publisher: "${draft.topic_title}"...`);
      try {
        const result = await postJson<{ dry_run: boolean; url?: string; output: string }>("/api/publish", {
          topic: draft.topic_title,
          text: finalText ?? draft.text,
          image_path: draft.image_path,
          article_url: draft.source_url,
        });
        pushLog(`Publisher: "${draft.topic_title}" — ${result.dry_run ? "dry run (no LinkedIn token)" : "published"}`, "success");
        const next = {
          ...run,
          decisions: { ...run.decisions, [topicTitle]: { decision, final_text: finalText } },
          publish_results: { ...run.publish_results, [topicTitle]: result },
        };
        setRun(next);
        persistRun(next);
      } catch (e) {
        pushLog(`Publisher: "${draft.topic_title}" failed — ${(e as Error).message}`, "error");
        setError(`Failed to publish "${draft.topic_title}": ${(e as Error).message}`);
      }
      return;
    }

    const next = { ...run, decisions: { ...run.decisions, [topicTitle]: { decision, final_text: finalText } } };
    setRun(next);
    persistRun(next);
  }

  async function scheduleDraft(topicTitle: string, isoDateTime: string) {
    const draft = drafts.find((d) => d.topic_title === topicTitle)!;
    await postJson("/api/scheduled", {
      run_id: run.id,
      topic_title: draft.topic_title,
      pillar: draft.pillar,
      text: run.decisions[topicTitle]?.final_text ?? draft.text,
      image_path: draft.image_path,
      article_url: draft.source_url,
      scheduled_at: isoDateTime,
    });
    const next = {
      ...run,
      decisions: {
        ...run.decisions,
        [topicTitle]: { decision: "approved" as const, final_text: run.decisions[topicTitle]?.final_text, scheduled_at: isoDateTime },
      },
    };
    setRun(next);
    persistRun(next);
  }

  function attachImage(topicTitle: string, imagePath: string | undefined) {
    setDrafts((ds) => ds.map((d) => (d.topic_title === topicTitle ? { ...d, image_path: imagePath } : d)));
    const next = {
      ...run,
      drafts: run.drafts.map((d) => (d.topic_title === topicTitle ? { ...d, image_path: imagePath } : d)),
    };
    setRun(next);
    persistRun(next);
  }

  const allDecided = drafts.length > 0 && drafts.every((d) => run.decisions[d.topic_title]);

  async function finishRun() {
    const finalRun: RunRecord = { ...run, status: "completed" };
    try {
      await postJson("/api/runs", finalRun);
    } catch (e) {
      setError(`Couldn't save the finished run: ${(e as Error).message}`);
      return;
    }
    try {
      await postJson("/api/strategy", finalRun);
    } catch {
      // Non-fatal — the run itself is saved; the strategy log entry is a nice-to-have.
    }
    fetch(`/api/run-usage/${run.id}`)
      .then((r) => r.json())
      .then((d) => setFinalCost(d.cost_usd))
      .catch(() => {});
    setRun(finalRun);
    setPhase("done");
  }

  return (
    <div>
      <div className="eyebrow mb-2.5">Run the agents</div>
      <h1 className="text-[38px] font-bold mb-6">Pipeline</h1>

      {checkedResume && resumable && (
        <div className="panel-outline p-4 mb-6 flex items-center justify-between gap-4 animate-phase-in" style={{ borderColor: "oklch(0.78 0.16 85 / 0.5)" }}>
          <div className="text-sm" style={{ color: "var(--warn)" }}>
            Found an unfinished run from {new Date(resumable.created_at).toLocaleString()} — pick up where you left off?
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="btn-primary btn-sm" onClick={() => resume(resumable)}>
              Resume
            </button>
            <button className="btn-outline btn-sm" onClick={() => discardResumable(resumable)}>
              Discard
            </button>
          </div>
        </div>
      )}

      <PipelineFlow stages={stages} />

      <ActivityLog entries={log} />

      {error && <ErrorBanner message={error} className="mb-6 animate-phase-in" />}

      <div key={phase} className="animate-phase-in">
        {phase === "ideas" && (
          <div className="space-y-4">
            <p className="text-base text-term-muted max-w-[640px]">
              What topics or ideas are on your mind this week? One per line — or leave blank and I&apos;ll find
              everything from research.
            </p>
            <textarea
              className="terminal-input h-40 max-w-[900px] resize-y"
              value={ideasInput}
              onChange={(e) => setIdeasInput(e.target.value)}
              placeholder="I built a tool that..."
              aria-label="Topics or ideas for this week"
            />
            <div>
              <button className="btn-primary text-[15px]" onClick={startResearch}>
                Find topics
              </button>
            </div>
          </div>
        )}

        {phase === "researching" && (
          <div className="space-y-4">
            <PulseLine label="SCANNING — researching trending topics, ranking the top 8..." />
            <button className="btn-outline btn-sm" onClick={cancelInFlight}>
              Cancel
            </button>
          </div>
        )}

        {phase === "topics" && <TopicChecklist topics={run.ranked_topics} onContinue={onTopicsChosen} />}

        {phase === "developing" && (
          <div className="space-y-4">
            <PulseLine label="DEVELOPING — deep-researching your picks, forging hooks..." />
            <button className="btn-outline btn-sm" onClick={cancelInFlight}>
              Cancel
            </button>
          </div>
        )}

        {phase === "hooks" && <HookPicker topicHooks={hooksByTopic} onContinue={onHooksChosen} />}

        {phase === "writing" && (
          <div className="space-y-4">
            <PulseLine label="WRITING — drafting in your voice, polishing..." />
            <button className="btn-outline btn-sm" onClick={cancelInFlight}>
              Cancel
            </button>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review each post</h2>
            {drafts.map((draft) => (
              <PostApprovalCard
                key={draft.topic_title}
                runId={run.id}
                draft={run.decisions[draft.topic_title]?.final_text ? { ...draft, text: run.decisions[draft.topic_title].final_text! } : draft}
                decision={run.decisions[draft.topic_title]?.decision}
                scheduledAt={run.decisions[draft.topic_title]?.scheduled_at}
                onApprove={() => decide(draft.topic_title, "approved")}
                onSkip={() => decide(draft.topic_title, "skipped")}
                onSchedule={(isoDateTime) => scheduleDraft(draft.topic_title, isoDateTime)}
                onAttachImage={(imagePath) => attachImage(draft.topic_title, imagePath)}
                onRevise={async (feedback) => {
                  const revised = await postJson<Draft>("/api/edit", { draft, feedback, run_id: run.id });
                  const withImage = { ...revised, image_path: draft.image_path, source_url: draft.source_url };
                  setDrafts((ds) => ds.map((d) => (d.topic_title === draft.topic_title ? withImage : d)));
                  await decide(draft.topic_title, "revised", withImage.text);
                }}
              />
            ))}
            {allDecided && (
              <button className="btn-primary text-[15px]" onClick={finishRun}>
                Finish run
              </button>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="panel px-8 py-7 text-[15px] font-mono">
            ✓ Pipeline complete. {Object.values(run.decisions).filter((d) => d.decision === "approved").length} post
            {Object.values(run.decisions).filter((d) => d.decision === "approved").length === 1 ? "" : "s"} approved
            and saved. Check the Drafts and Logs pages.
            {finalCost != null && (
              <div className="text-term-dim mt-2">This run cost an estimated ${finalCost.toFixed(2)}.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
