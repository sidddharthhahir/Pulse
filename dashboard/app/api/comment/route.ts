import { NextResponse } from "next/server";
import { createTracked, MODEL, extractJson, textFromMessage, THINKING_DISABLED } from "@/lib/claude";
import { readKb } from "@/lib/knowledge-base";

export async function POST(req: Request) {
  try {
    const { post_text } = (await req.json()) as { post_text: string };
    const [writing_samples, content_rules] = await Promise.all([
      readKb("writing_samples"),
      readKb("content_rules"),
    ]);

    const message = await createTracked({
      model: MODEL,
      cache_control: { type: "ephemeral" },
      max_tokens: 1500,
      output_config: { effort: "low" },
      thinking: THINKING_DISABLED,
      messages: [
        {
          role: "user",
          content: `Someone else posted this on LinkedIn:
---
${post_text}
---

Write 3 short comment options in this voice (not a full post — a comment, 1-3 sentences, specific to what they said, not generic praise):

## Voice reference
${writing_samples}

## Tone rules
${content_rules}

Each comment should take a genuinely different angle: e.g. one adds a related experience, one asks a sharp follow-up question, one respectfully pushes back or adds nuance. No generic "Great post!" filler — engage with the actual content.

Respond with ONLY this JSON, nothing else:
{"comments": ["...", "...", "..."]}`,
        },
      ],
    });

    const parsed = extractJson<{ comments: string[] }>(textFromMessage(message));
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
