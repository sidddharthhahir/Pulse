import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RunRecord } from "../types";

const { listRuns } = vi.hoisted(() => ({ listRuns: vi.fn() }));
vi.mock("../runs", () => ({ listRuns }));

// Import after the mock is registered so analytics.ts picks up the mocked listRuns.
const { getPerformanceStatus, getImageNudge, getBestPostingTime } = await import("../analytics");

function makeRun(overrides: Partial<RunRecord> = {}): RunRecord {
  const now = new Date().toISOString();
  return {
    id: "run_1",
    created_at: now,
    updated_at: now,
    status: "completed",
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
    ...overrides,
  };
}

beforeEach(() => {
  listRuns.mockReset();
});

describe("getPerformanceStatus", () => {
  it("is inactive below the sample threshold", async () => {
    listRuns.mockResolvedValue([
      makeRun({ performance: { a: { impressions: 100, recorded_at: "2026-01-01" } } }),
    ]);
    const status = await getPerformanceStatus();
    expect(status.active).toBe(false);
    expect(status.count).toBe(1);
    expect(status.threshold).toBe(3);
  });

  it("activates once 3+ posts have recorded performance", async () => {
    listRuns.mockResolvedValue([
      makeRun({
        performance: {
          a: { impressions: 100, recorded_at: "2026-01-01" },
          b: { impressions: 200, recorded_at: "2026-01-02" },
          c: { impressions: 300, recorded_at: "2026-01-03" },
        },
      }),
    ]);
    const status = await getPerformanceStatus();
    expect(status.active).toBe(true);
    expect(status.count).toBe(3);
  });

  it("ignores performance entries with neither impressions nor reactions recorded", async () => {
    listRuns.mockResolvedValue([
      makeRun({ performance: { a: { recorded_at: "2026-01-01" } } }),
    ]);
    const status = await getPerformanceStatus();
    expect(status.count).toBe(0);
  });
});

describe("getImageNudge", () => {
  it("falls back to generic best-practice framing without enough per-side data", async () => {
    listRuns.mockResolvedValue([makeRun()]);
    const nudge = await getImageNudge();
    expect(nudge.basedOnData).toBe(false);
    expect(nudge.shouldNudge).toBe(true);
  });

  it("uses real averages once there are 2+ posts on each side", async () => {
    listRuns.mockResolvedValue([
      makeRun({
        drafts: [
          { topic_title: "img1", pillar: "p", hook: "h", text: "t", word_count: 1, image_path: "/x.png" },
          { topic_title: "img2", pillar: "p", hook: "h", text: "t", word_count: 1, image_path: "/x.png" },
          { topic_title: "txt1", pillar: "p", hook: "h", text: "t", word_count: 1 },
          { topic_title: "txt2", pillar: "p", hook: "h", text: "t", word_count: 1 },
        ],
        performance: {
          img1: { impressions: 500, recorded_at: "2026-01-01" },
          img2: { impressions: 500, recorded_at: "2026-01-01" },
          txt1: { impressions: 100, recorded_at: "2026-01-01" },
          txt2: { impressions: 100, recorded_at: "2026-01-01" },
        },
      }),
    ]);
    const nudge = await getImageNudge();
    expect(nudge.basedOnData).toBe(true);
    expect(nudge.shouldNudge).toBe(true); // images averaged higher
  });

  it("reports shouldNudge false when the data says text outperforms images", async () => {
    listRuns.mockResolvedValue([
      makeRun({
        drafts: [
          { topic_title: "img1", pillar: "p", hook: "h", text: "t", word_count: 1, image_path: "/x.png" },
          { topic_title: "img2", pillar: "p", hook: "h", text: "t", word_count: 1, image_path: "/x.png" },
          { topic_title: "txt1", pillar: "p", hook: "h", text: "t", word_count: 1 },
          { topic_title: "txt2", pillar: "p", hook: "h", text: "t", word_count: 1 },
        ],
        performance: {
          img1: { impressions: 50, recorded_at: "2026-01-01" },
          img2: { impressions: 50, recorded_at: "2026-01-01" },
          txt1: { impressions: 300, recorded_at: "2026-01-01" },
          txt2: { impressions: 300, recorded_at: "2026-01-01" },
        },
      }),
    ]);
    const nudge = await getImageNudge();
    expect(nudge.basedOnData).toBe(true);
    expect(nudge.shouldNudge).toBe(false);
  });
});

describe("getBestPostingTime", () => {
  it("is inactive below the sample threshold", async () => {
    listRuns.mockResolvedValue([
      makeRun({
        publish_results: { a: { dry_run: false, output: "" } },
        performance: { a: { impressions: 100, recorded_at: "2026-01-01" } },
      }),
    ]);
    const signal = await getBestPostingTime();
    expect(signal.active).toBe(false);
  });

  it("ignores dry-run-only runs even with enough performance entries", async () => {
    listRuns.mockResolvedValue([
      makeRun({
        publish_results: { a: { dry_run: true, output: "" } },
        performance: {
          a: { impressions: 100, recorded_at: "2026-01-01" },
          b: { impressions: 200, recorded_at: "2026-01-01" },
          c: { impressions: 300, recorded_at: "2026-01-01" },
        },
      }),
    ]);
    const signal = await getBestPostingTime();
    expect(signal.active).toBe(false);
  });

  it("surfaces the single best-performing real publish once active", async () => {
    listRuns.mockResolvedValue([
      makeRun({
        updated_at: "2026-01-05T11:00:00.000Z",
        publish_results: { a: { dry_run: false, output: "" } },
        performance: {
          a: { impressions: 100, recorded_at: "2026-01-01" },
          b: { impressions: 900, recorded_at: "2026-01-01" },
          c: { impressions: 300, recorded_at: "2026-01-01" },
        },
      }),
    ]);
    const signal = await getBestPostingTime();
    expect(signal.active).toBe(true);
    expect(signal.best?.impressions).toBe(900);
  });
});
