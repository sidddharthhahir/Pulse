import { NextResponse } from "next/server";
import { createTracked, MODEL, webSearchTool, extractJson, textFromMessage, THINKING_DISABLED } from "@/lib/claude";
import { RankedTopic, ResearchBrief } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { topic, run_id } = (await req.json()) as { topic: RankedTopic; run_id?: string };

    const message = await createTracked(
      {
        model: MODEL,
        cache_control: { type: "ephemeral" },
        max_tokens: 4000,
        output_config: { effort: "low" },
        thinking: THINKING_DISABLED,
        tools: [webSearchTool(3)],
        messages: [
          {
            role: "user",
            content: `Research this LinkedIn post topic:

Title: ${topic.title}
Angle: ${topic.angle}
Why now: ${topic.why_now}
Pillar: ${topic.pillar}

Use AT MOST 2-3 targeted web searches (not more) to find supporting stats, concrete examples, and interesting angles. Then propose several hook-candidate opening lines (raw material only — a separate step will pick the final hook type).

${
  topic.format === "hot-topic"
    ? 'This is a hot-topic/news post. Also find the single primary source article URL for this story (the original news piece, not a secondary aggregator) — put it in "source_url".'
    : 'This is not a news post — omit "source_url" or leave it empty.'
}

Respond with ONLY this JSON, nothing else:
{"topic_title": "${topic.title.replace(/"/g, '\\"')}", "stats": ["..."], "examples": ["..."], "angles": ["..."], "hook_candidates": ["..."], "source_url": "..."}`,
          },
        ],
      },
      run_id
    );

    const text = textFromMessage(message);
    const parsed = extractJson<ResearchBrief>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
