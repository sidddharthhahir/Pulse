import { describe, it, expect } from "vitest";
import { extractSampleBodies, analyzeVoice } from "../voice-dna";

const TEMPLATE = `# Your Writing Samples — Tone & Voice Reference

## Samples
No pasted samples yet.

## Sample — 2026-07-23
**Performance:** Not tracked
**Why it works:** Added from Drafts

This is a real post about AI observability. It has more than one sentence in it.

Is your team instrumenting AI calls yet, or still finding out from user complaints?

#AIEngineering #Observability`;

describe("extractSampleBodies", () => {
  it("returns an empty array when there are no ## Sample sections", () => {
    expect(extractSampleBodies("# Your Writing Samples\n\nNo pasted samples yet.")).toEqual([]);
  });

  it("extracts the body of a real sample, stripping the metadata lines", () => {
    const bodies = extractSampleBodies(TEMPLATE);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toMatch(/\*\*Performance:\*\*/);
    expect(bodies[0]).not.toMatch(/\*\*Why it works:\*\*/);
    expect(bodies[0]).toMatch(/AI observability/);
  });

  it("drops short/junk sections under the length threshold", () => {
    const content = "## Sample — 2026-01-01\n**Performance:** n/a\ntoo short";
    expect(extractSampleBodies(content)).toEqual([]);
  });
});

describe("analyzeVoice", () => {
  it("returns null for zero samples", () => {
    expect(analyzeVoice([])).toBeNull();
  });

  it("computes sample count and basic stats for real samples", () => {
    const samples = [
      "This is short. It has two sentences.\n\nDoes it work well?",
      "Another sample here. Also two sentences.\n\n#hashtag #another",
    ];
    const dna = analyzeVoice(samples);
    expect(dna).not.toBeNull();
    expect(dna!.sampleCount).toBe(2);
    expect(dna!.avgHashtags).toBeCloseTo(1, 5);
    expect(dna!.questionPostRate).toBe(50); // only the first sample ends on a question
  });

  it("counts em dashes and arrow-list markers per post", () => {
    const samples = ["A line — with a dash.\n\n→ one\n→ two"];
    const dna = analyzeVoice(samples)!;
    expect(dna.emDashPerPost).toBe(1);
    expect(dna.arrowListPerPost).toBe(2);
  });

  it("excludes stopwords and hashtags from the top-words list", () => {
    const samples = ["The the the and and but observability observability observability. #Observability"];
    const dna = analyzeVoice(samples)!;
    const words = dna.topWords.map((w) => w.word);
    expect(words).not.toContain("the");
    expect(words).not.toContain("and");
    expect(words).not.toContain("but");
    expect(words).toContain("observability");
  });
});
