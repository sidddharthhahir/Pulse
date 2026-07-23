import { NextResponse } from "next/server";
import { createTracked, MODEL, webSearchTool, extractJson, textFromMessage, THINKING_DISABLED } from "@/lib/claude";
import { readProfileCore } from "@/lib/knowledge-base";
import { Topic } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { run_id } = (await req.json().catch(() => ({}))) as { run_id?: string };
    const profile = await readProfileCore();
    const today = new Date().toISOString().slice(0, 10);

    const message = await createTracked(
      {
        model: MODEL,
        cache_control: { type: "ephemeral" },
        max_tokens: 4000,
        output_config: { effort: "low" },
        thinking: THINKING_DISABLED,
        tools: [webSearchTool(5)],
        messages: [
          {
            role: "user",
            content: `You are a content research analyst for a LinkedIn content pipeline. Today's date: ${today}.

Here is the user's profile (identity, audience, pillars):
---
${profile}
---

Use AT MOST 4-5 targeted web searches total (not one per topic) to find 10-12 trending topics that fit this specific person's content pillars and audience — nothing generic, nothing off-pillar. Include at least one "hot-topic" item: a major AI news story from this week where the real implication isn't obvious from the headline (a "reading between the lines" angle). Be efficient — a couple of well-chosen broad searches beat many narrow ones.

Respond with ONLY this JSON, nothing else:
{"topics": [{"title": "...", "why_trending": "...", "angle": "...", "pillar": "...", "format": "standard"}]}

"format" is "standard" or "hot-topic". "pillar" must be one of the pillars listed in the profile above, verbatim.`,
          },
        ],
      },
      run_id
    );

    const text = textFromMessage(message);
    const parsed = extractJson<{ topics: Topic[] }>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
