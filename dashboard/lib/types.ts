export interface Topic {
  title: string;
  why_trending: string;
  angle: string;
  pillar: string;
  format: "standard" | "hot-topic";
}

export interface RankedTopic extends Topic {
  rank: number;
  source: "Research" | "Your idea" | "Your idea + trending";
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
  type: "Raw number" | "Provocative" | "Admission + reversal" | "Contrast" | "Specific moment" | "Curiosity gap";
  text: string;
}

export interface TopicHooks {
  topic_title: string;
  hooks: HookOption[];
}

export interface Draft {
  topic_title: string;
  pillar: string;
  hook: string;
  text: string;
  word_count: number;
  image_path?: string;
  source_url?: string;
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
