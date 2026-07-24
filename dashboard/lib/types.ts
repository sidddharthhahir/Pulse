export interface Topic {
  title: string;
  why_trending: string;
  angle: string;
  pillar: string;
  format: "standard" | "hot-topic";
}

// Not `extends Topic` — /api/rank drops why_trending when it re-shapes the
// merged list, so a RankedTopic never actually has it. Keep this in sync
// with the "ranked_topics" JSON schema in app/api/rank/route.ts.
export interface RankedTopic {
  rank: number;
  title: string;
  source: "Research" | "Your idea" | "Your idea + trending";
  pillar: string;
  format: "standard" | "hot-topic";
  angle: string;
  why_now: string;
}

export interface ResearchBrief {
  topic_title: string;
  stats: string[];
  examples: string[];
  angles: string[];
  hook_candidates: string[];
  source_url?: string;
}

export interface HookOption {
  type: "Raw number" | "Provocative" | "Curiosity gap";
  text: string;
  recommended?: boolean;
  why?: string;
}

export interface TopicHooks {
  topic_title: string;
  hooks: HookOption[];
}

export interface DraftReasoning {
  angle_why?: string;
  edit_changes?: string[];
}

export interface Draft {
  topic_title: string;
  pillar: string;
  hook: string;
  text: string;
  word_count: number;
  image_path?: string;
  source_url?: string;
  reasoning?: DraftReasoning;
}

export type Decision = "approved" | "revised" | "skipped";

export interface PostPerformance {
  impressions?: number;
  reactions?: number;
  comments?: number;
  recorded_at: string;
}

export interface RunRecord {
  id: string;
  created_at: string;
  updated_at: string;
  status: "in_progress" | "completed";
  ranked_topics: RankedTopic[];
  selected_topics: string[];
  discarded_topics: string[];
  research_briefs: ResearchBrief[];
  hooks: TopicHooks[];
  selected_hooks: Record<string, string>;
  drafts: Draft[];
  decisions: Record<string, { decision: Decision; final_text?: string; notes?: string; scheduled_at?: string }>;
  publish_results: Record<string, { dry_run: boolean; url?: string; output: string }>;
  performance: Record<string, PostPerformance>;
}

export interface ScheduledPost {
  id: string;
  run_id: string;
  topic_title: string;
  pillar: string;
  text: string;
  image_path?: string;
  article_url?: string;
  scheduled_at: string;
  status: "pending" | "published" | "failed" | "canceled";
  created_at: string;
  publish_result?: { dry_run: boolean; url?: string; output: string };
  error?: string;
}
