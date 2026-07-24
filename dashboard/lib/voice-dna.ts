// Client-safe, zero-cost text analysis — no Claude calls. Reads the raw
// writing_samples.md content the Knowledge page already has in memory.

export interface VoiceDNA {
  sampleCount: number;
  avgWordsPerPost: number;
  avgSentenceLength: number;
  topWords: { word: string; count: number }[];
  emojiPerPost: number;
  emDashPerPost: number;
  arrowListPerPost: number;
  questionPostRate: number;
  avgHashtags: number;
}

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "you", "your", "are", "was",
  "were", "have", "has", "had", "not", "but", "just", "what", "when", "where",
  "which", "who", "how", "why", "from", "into", "than", "then", "them", "they",
  "their", "there", "here", "about", "over", "under", "out", "off", "our",
  "its", "it's", "i'm", "i've", "im", "one", "all", "any", "can", "could",
  "would", "should", "will", "does", "did", "get", "got", "like", "even",
  "still", "most", "more", "some", "every", "each", "been", "being", "own",
  "day", "week", "month", "year", "time", "way", "thing", "things", "really",
  "very", "much", "many", "actually", "before", "after", "because", "while",
  "also", "only", "same", "such", "these", "those", "you're", "don't",
  "didn't", "doesn't", "isn't", "wasn't", "aren't", "we're", "we've",
  "it's", "that's", "there's", "here's", "let's", "won't", "can't",
  "couldn't", "wouldn't", "shouldn't", "you'll", "i'll", "we'll",
  "they're", "who's", "what's", "into", "onto", "upon",
]);

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export function extractSampleBodies(rawWritingSamples: string): string[] {
  const sections = rawWritingSamples.split(/^## Sample — .+$/m).slice(1);
  return sections
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !/^\*\*(Performance|Why it works):\*\*/.test(line.trim()))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 40);
}

export function analyzeVoice(samples: string[]): VoiceDNA | null {
  if (samples.length === 0) return null;

  let totalWords = 0;
  let totalSentences = 0;
  let emojiCount = 0;
  let emDashCount = 0;
  let arrowCount = 0;
  let questionEndings = 0;
  let hashtagTotal = 0;
  const wordFreq = new Map<string, number>();

  for (const sample of samples) {
    const noHashtags = sample.replace(/#\w+/g, "");
    const words = noHashtags.match(/[A-Za-z']+/g) || [];
    totalWords += words.length;
    for (const w of words) {
      const lw = w.toLowerCase();
      if (lw.length < 3 || STOPWORDS.has(lw)) continue;
      wordFreq.set(lw, (wordFreq.get(lw) || 0) + 1);
    }

    const sentences = noHashtags
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).filter(Boolean).length >= 3);
    totalSentences += sentences.length;

    emojiCount += (sample.match(EMOJI_RE) || []).length;
    emDashCount += (sample.match(/—/g) || []).length;
    arrowCount += (sample.match(/→/g) || []).length;
    hashtagTotal += (sample.match(/#\w+/g) || []).length;

    const lines = sample.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const lastTextLine = [...lines].reverse().find((l) => !l.startsWith("#")) || "";
    if (lastTextLine.includes("?")) questionEndings++;
  }

  const topWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  return {
    sampleCount: samples.length,
    avgWordsPerPost: Math.round(totalWords / samples.length),
    avgSentenceLength: totalSentences > 0 ? Math.round((totalWords / totalSentences) * 10) / 10 : 0,
    topWords,
    emojiPerPost: Math.round((emojiCount / samples.length) * 10) / 10,
    emDashPerPost: Math.round((emDashCount / samples.length) * 10) / 10,
    arrowListPerPost: Math.round((arrowCount / samples.length) * 10) / 10,
    questionPostRate: Math.round((questionEndings / samples.length) * 100),
    avgHashtags: Math.round((hashtagTotal / samples.length) * 10) / 10,
  };
}
