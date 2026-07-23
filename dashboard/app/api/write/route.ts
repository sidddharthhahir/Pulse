import { NextResponse } from "next/server";
import { createTracked, MODEL, extractJson, textFromMessage, staticBlock, dynamicBlock } from "@/lib/claude";
import { readAllKb } from "@/lib/knowledge-base";
import { Draft, RankedTopic, ResearchBrief } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { topic, brief, hook, run_id } = (await req.json()) as {
      topic: RankedTopic;
      brief: ResearchBrief;
      hook: string;
      run_id?: string;
    };
    const kb = await readAllKb();

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

Write the complete post now, following the content rules exactly (structure, length, hashtags, CTA). Opinion over information — a clear held view, not a summary. Mode A (real story) or Mode C (clear point of view), never Mode B (faceless article).`),
            // Differs per topic — never cached.
            dynamicBlock(`## Topic
Title: ${topic.title}
Angle: ${topic.angle}
Pillar: ${topic.pillar}
Research brief: ${JSON.stringify(briefForWriter, null, 2)}

## Required hook
Use this exact text as the opening line (line 1-2), followed by ONE blank line, then the body:
"${hook}"

Respond with ONLY this JSON, nothing else:
{"topic_title": "${topic.title.replace(/"/g, '\\"')}", "pillar": "${topic.pillar}", "hook": ${JSON.stringify(hook)}, "text": "the full post text, exactly as it would appear on LinkedIn", "word_count": 0}

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
