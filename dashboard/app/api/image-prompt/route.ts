import { NextResponse } from "next/server";
import { createTracked, MODEL, extractJson, textFromMessage, THINKING_DISABLED } from "@/lib/claude";
import { Draft } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { draft, run_id } = (await req.json()) as { draft: Draft; run_id?: string };

    const message = await createTracked(
      {
        model: MODEL,
        max_tokens: 500,
        output_config: { effort: "low" },
        thinking: THINKING_DISABLED,
        messages: [
          {
            role: "user",
            content: `Write ONE image-generation prompt (for an external tool like Gemini or GPT image models) to accompany this LinkedIn post as a visual.

Rules for the prompt:
- Minimal — one clear subject or idea, not a busy scene. Negative space is good.
- Natural — photographic or softly illustrated. Never corporate clipart, never a stock-photo cliché (handshakes, lightbulbs, glowing brains), never a stat/data card, never a screenshot mockup.
- No text, words, letters, or numbers anywhere in the image — image models render text badly and it looks broken.
- Muted, tasteful color palette — not neon, not oversaturated.
- Evoke the post's core idea abstractly or symbolically, not literally illustrate it.

Post:
---
${draft.text}
---

Respond with ONLY this JSON, nothing else:
{"prompt": "the image-generation prompt, ready to paste into another tool"}`,
          },
        ],
      },
      run_id
    );

    const parsed = extractJson<{ prompt: string }>(textFromMessage(message));
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
