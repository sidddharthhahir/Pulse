"use client";

import { useState } from "react";
import PulseLine from "@/components/PulseLine";

export default function CommentsPage() {
  const [postText, setPostText] = useState("");
  const [comments, setComments] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setComments(null);
    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_text: postText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate comments");
      setComments(data.comments);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, i: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">Engage in your voice</div>
      <h1 className="text-[38px] font-bold mb-4">Comments</h1>
      <p className="text-term-muted text-base max-w-[720px] leading-relaxed mb-7">
        Paste a post you want to engage with — get 3 comment options in your voice. Growth on LinkedIn is at least as
        much about commenting as posting.
      </p>

      <textarea
        className="terminal-input h-40 max-w-[900px] resize-y mb-5"
        style={{ background: "var(--panel)" }}
        placeholder="Paste the post text here..."
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
      />
      <div className="mb-6">
        <button className="btn-primary text-[15px]" disabled={!postText.trim() || loading} onClick={generate}>
          {loading ? "Generating..." : "Generate comments"}
        </button>
      </div>

      {loading && <PulseLine label="DRAFTING — three angles, calibrated to your voice..." />}

      {error && (
        <div className="p-3 mb-5 text-sm font-mono max-w-[900px]" style={{ border: "1px solid oklch(0.65 0.2 25 / 0.5)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {comments && (
        <div className="space-y-3.5 max-w-[900px] animate-phase-in">
          {comments.map((c, i) => (
            <div key={i} className="panel-outline px-6 py-5">
              <p className="text-[15px] leading-[1.7] text-term-body mb-3.5">{c}</p>
              <button className="btn-outline btn-sm font-mono !text-[12px]" onClick={() => copy(c, i)}>
                {copiedIndex === i ? "✓ Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
