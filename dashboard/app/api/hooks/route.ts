import { NextResponse } from "next/server";
import { createTracked, MODEL, extractJson, textFromMessage, staticBlock, dynamicBlock, THINKING_DISABLED } from "@/lib/claude";
import { getPerformanceInsights } from "@/lib/analytics";
import { RankedTopic, ResearchBrief, TopicHooks } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { topic, brief, run_id } = (await req.json()) as { topic: RankedTopic; brief: ResearchBrief; run_id?: string };
    const insights = await getPerformanceInsights();

    const message = await createTracked(
      {
        model: MODEL,
        max_tokens: 3000,
        output_config: { effort: "medium" },
        thinking: THINKING_DISABLED,
        messages: [
        {
          role: "user",
          content: [
            // Identical across every hooks call in a run — cached once, read
            // at ~10% cost on topics 2 and 3.
            staticBlock(`Write 3 LinkedIn hook options for this post — one per hook type. Each hook is a single opening line (or two) that earns the scroll-stop, then would be followed by a blank line and the body.

The 3 types, in this exact order:
1. Raw number — a specific stat or figure
2. Provocative — a bold claim or reframing
3. Curiosity gap — state a strong, specific claim but withhold the one detail that resolves it (the condition, the mechanism, the number). The reader has to click "see more" to find out what it is. Example: "Your brain will accept almost any amount of hard work, as long as one condition is met." Don't tease something vague — the withheld detail must be concrete and answerable in the body.

Rules for all 3: every hook must be specific — vague hooks don't stop scrolls. No warm-up phrases ("In today's world...", "Have you ever wondered..."). No rhetorical questions. Each hook must feel meaningfully different from the others, not a variation of the same line. Maximum 2 lines, most should be 1.

After writing all 3, compare them against each other and decide which ONE would earn the most scroll-stops for this specific topic and audience — not just "which is well written" but which creates the strongest urge to click "see more". Mark that one as recommended.`),
            // Differs per topic — never cached.
            dynamicBlock(`Topic: ${topic.title}
Angle: ${topic.angle}
Research brief: ${JSON.stringify(brief, null, 2)}
${insights ? `\n${insights}\n` : ""}
Respond with ONLY this JSON, nothing else:
{"topic_title": "${topic.title.replace(/"/g, '\\"')}", "hooks": [{"type": "Raw number", "text": "...", "recommended": false}, {"type": "Provocative", "text": "...", "recommended": false}, {"type": "Curiosity gap", "text": "...", "recommended": false}]}

Set "recommended": true on exactly one of the three — your pick for the strongest hook — and leave the other two false. On the recommended one only, add a "why" field: one short sentence on why it beats the other two for this specific topic.`),
          ],
          },
        ],
      },
      run_id
    );

    const text = textFromMessage(message);
    const parsed = extractJson<TopicHooks>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
