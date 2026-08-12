import { NextResponse } from "next/server";
import { createTracked, MODEL, extractJson, textFromMessage, staticBlock, dynamicBlock } from "@/lib/claude";
import { readAllKb } from "@/lib/knowledge-base";
import { getPerformanceInsights } from "@/lib/analytics";
import { Draft, PostFormat, RankedTopic, ResearchBrief } from "@/lib/types";

// Structural skeletons for the two non-default formats — "standard" and
// "hot-topic" get no extra scaffolding, they just follow the base rules.
function formatGuidance(format: PostFormat): string {
  if (format === "expose") {
    return `## Structure — this is an "expose" post
Follow this shape:
1. Hook: state the hidden thing you found, matter-of-factly — no adjectives doing the work, just the fact.
2. "Before you judge it, think about why" — steelman the incentive behind the decision, with real numbers/mechanism if you have them.
3. The mechanism — show the actual hidden thing concretely (a quote, a config line, a clause), not a vague description.
4. The pivot, stated explicitly: "the problem isn't [the decision] — it's [how it was handled/disclosed]." This line is the engine of the post.
5. One concrete casualty — a specific instance where it caused real, tangible harm. No hedging.
6. The counterfactual — one line on what the honest version would have looked like (a toggle, a disclosure, a setting).
7. Closing line: a sharp one-liner that reframes the whole tension into a single sentence.`;
  }
  if (format === "listicle") {
    return `## Structure — this is a "listicle" post
Follow this shape:
1. Hook: lead with ONE standout, fully-spelled-out concrete item — not "here are N tips." The single best item IS the hook.
2. One line on why that first item actually works.
3. An arrow list (→) of the remaining concrete items, each specific and usable as-is — ranked by real usefulness/frequency, not arbitrary order.
4. A synthesis paragraph: name the underlying principle that ties the list together — this is what makes it read as insight, not just a list.
5. Optional: one line naming what's overrated or commonly misunderstood about this topic.
6. Closing: a specific, answerable question inviting the reader's own item — not a generic "thoughts?"`;
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const { topic, brief, hook, run_id } = (await req.json()) as {
      topic: RankedTopic;
      brief: ResearchBrief;
      hook: string;
      run_id?: string;
    };
    const kb = await readAllKb();
    const insights = await getPerformanceInsights();
    const today = new Date().toISOString().slice(0, 10);

    // The hook is already chosen — its candidates are dead weight at this stage.
    const { hook_candidates: _dropped, ...briefForWriter } = brief;

    const message = await createTracked(
      {
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "high" },
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            // Identical across every write call in a run (same KB, same run) —
            // cached once, read at ~10% cost on the 2nd/3rd topic's write call.
            staticBlock(`Write a full LinkedIn post draft.

## Core profile
${kb.profile}

## Content rules (treat as law)
${kb.content_rules}

## Voice reference
${kb.writing_samples}

Write the complete post now, following the content rules exactly (structure, length, hashtags, CTA). Opinion over information — a clear held view, not a summary. Mode A (real story) or Mode C (clear point of view), never Mode B (faceless article).

This is a feed post someone skims in three seconds, not an article someone sits down to read. Before you write, plan which 2+ points become an arrow list (→) instead of a paragraph — almost every post has at least one. Keep sentences short and vary their length; no sentence over ~20 words, never three same-length sentences back to back. If you catch yourself writing a compound sentence stacking two ideas with a colon or semicolon, split it into two lines instead.`),
            // Differs per topic — never cached.
            dynamicBlock(`## Topic
Today's date: ${today}. Ground the post in what's actually current — don't lean on an older stat or example from the brief if it reads as dated; a specific recent detail beats a well-worn one.
Title: ${topic.title}
Angle: ${topic.angle}
Pillar: ${topic.pillar}
Research brief: ${JSON.stringify(briefForWriter, null, 2)}
${formatGuidance(topic.format) ? `\n${formatGuidance(topic.format)}\n` : ""}
${insights ? `\n${insights}\n` : ""}
## Required hook
Use this exact text as the opening line (line 1-2), followed by ONE blank line, then the body:
"${hook}"

Respond with ONLY this JSON, nothing else:
{"topic_title": "${topic.title.replace(/"/g, '\\"')}", "pillar": "${topic.pillar}", "hook": ${JSON.stringify(hook)}, "text": "the full post text, exactly as it would appear on LinkedIn", "word_count": 0, "reasoning": {"angle_why": "one sentence on which stat/example from the research brief you built the post around, and why that one over the others"}}

Set word_count to the actual word count of "text".`),
          ],
        },
      ],
      },
      run_id
    );

    const text = textFromMessage(message);
    const parsed = extractJson<Draft>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
