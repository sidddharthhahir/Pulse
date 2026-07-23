import { NextResponse } from "next/server";
import { createTracked, MODEL, extractJson, textFromMessage, THINKING_DISABLED } from "@/lib/claude";
import { readKb } from "@/lib/knowledge-base";
import { Draft } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { draft, feedback, run_id } = (await req.json()) as { draft: Draft; feedback?: string; run_id?: string };
    const content_rules = await readKb("content_rules");

    const message = await createTracked(
      {
        model: MODEL,
        cache_control: { type: "ephemeral" },
        max_tokens: 4000,
        output_config: { effort: "medium" },
        thinking: THINKING_DISABLED,
        messages: [
          {
            role: "user",
            content: `You are the style editor. Run this LinkedIn post draft through the quality checklist in the content rules and polish it. ${
              feedback
                ? `The user asked for this specific change — apply it: "${feedback}"`
                : "No specific revision requested — just tighten against the checklist."
            }

## Content rules (treat as law)
${content_rules}

## Draft
${draft.text}

Checklist: clear opinion someone could disagree with; Mode A or C, never B; hook earns the scroll-stop; no AI-sounding or corporate phrasing; cut any sentence that could be cut without loss; word count within the stated range.

Respond with ONLY this JSON, nothing else:
{"topic_title": ${JSON.stringify(draft.topic_title)}, "pillar": ${JSON.stringify(draft.pillar)}, "hook": ${JSON.stringify(draft.hook)}, "text": "the polished full post text", "word_count": 0}

Set word_count to the actual word count of "text".`,
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
