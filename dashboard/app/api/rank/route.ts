import { NextResponse } from "next/server";
import { createTracked, MODEL, extractJson, textFromMessage, THINKING_DISABLED } from "@/lib/claude";
import { readProfileCore } from "@/lib/knowledge-base";
import { getPerformanceInsights } from "@/lib/analytics";
import { RankedTopic, Topic } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { topics, ideas, run_id } = (await req.json()) as { topics: Topic[]; ideas: string[]; run_id?: string };
    // Stories included: the ranker scores "story potential" against the story bank
    const profile = await readProfileCore(true);
    const insights = await getPerformanceInsights();

    const message = await createTracked(
      {
        model: MODEL,
        cache_control: { type: "ephemeral" },
        max_tokens: 4000,
        output_config: { effort: "low" },
        thinking: THINKING_DISABLED,
        messages: [
          {
            role: "user",
            content: `You are a content strategist. Merge two topic lists and rank them for LinkedIn performance.

User profile:
---
${profile}
---

User's personal ideas this week (keep exact wording, never rephrase, tag source "Your idea"):
${ideas.length ? ideas.map((i) => `- ${i}`).join("\n") : "(none provided)"}

Research topics (tag source "Research"):
${JSON.stringify(topics, null, 2)}

Merge, dedupe near-duplicates, and rank on: pillar fit, story potential (can the user say something real and specific — see the story bank in the profile), audience relevance, and differentiation vs generic LinkedIn content. Preserve the "format" field. Include at least one "hot-topic" in the final list if one exists in the input. A strong personal idea with a real story and clear CTA should rank highly.
${insights ? `\n${insights}\n` : ""}

Respond with ONLY this JSON, nothing else, with exactly 8 ranked topics:
{"ranked_topics": [{"rank": 1, "title": "...", "source": "Research", "pillar": "...", "format": "standard", "angle": "...", "why_now": "..."}]}`,
          },
        ],
      },
      run_id
    );

    const text = textFromMessage(message);
    const parsed = extractJson<{ ranked_topics: RankedTopic[] }>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
