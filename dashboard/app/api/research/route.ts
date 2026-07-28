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
        tools: [webSearchTool(7)],
        messages: [
          {
            role: "user",
            content: `You are a content research analyst for a LinkedIn content pipeline. Today's date: ${today}.

Here is the user's profile (identity, audience, pillars):
---
${profile}
---

Use AT MOST 6-7 targeted web searches total (not one per topic) to find 10-12 trending topics that fit this specific person's content pillars and audience — nothing generic, nothing off-pillar. Be efficient — a couple of well-chosen broad searches beat many narrow ones. Pull from a mix of these sources, not just general news:

1. Industry news — include at least one "hot-topic" item: a major AI news story from this week where the real implication isn't obvious from the headline (a "reading between the lines" angle).
2. Competitor LinkedIn posts — search for what other LinkedIn creators in AI/tech are posting about and getting engagement on right now. Mine these for angles and "what's resonating" signal, not for content to copy. Use plain-language search queries, not site: operators — they tend to return empty on this tool.
3. X/Twitter discourse — search for real-time AI engineering takes and debates circulating on X/Twitter this week. Same rule — plain-language queries, not site: operators.

Budget roughly 2 searches per source. If a search comes back empty or unhelpful, do NOT retry it — move on to the next source immediately. Never spend more than one retry total across the whole task.

CRITICAL: no matter what happens with search — even if a source turns up nothing, even if you're on your last search — your response MUST end with the JSON object below and nothing else. Never respond with commentary about your search process, an explanation that you're retrying, or anything other than the final JSON. Drop a source that came up empty rather than forcing a topic from it, but always output the JSON.

Respond with ONLY this JSON, nothing else:
{"topics": [{"title": "...", "why_trending": "...", "angle": "...", "pillar": "...", "format": "standard"}]}

"format" is "standard" or "hot-topic". "pillar" must be one of the pillars listed in the profile above, verbatim. "why_trending" should name where you actually saw this (e.g. "OpenAI's blog this week", "seen resurfacing across several LinkedIn AI-engineering posts", "trending in X's AI eng discourse") — never fabricate a source.`,
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
