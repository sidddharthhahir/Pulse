"use client";

import { useEffect, useRef, useState } from "react";
import { Draft } from "@/lib/types";

interface ImageNudge {
  shouldNudge: boolean;
  basedOnData: boolean;
  count: number;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request to ${url} failed`);
  return data as T;
}

// Claude can't generate images, so this writes a minimal/natural image
// prompt from the post text — the user pastes it into Gemini or GPT
// themselves, then uploads the result here so it's carried through to
// publish/schedule with the post.
export default function ImageAttachment({
  draft,
  runId,
  imagePath,
  onAttach,
}: {
  draft: Draft;
  runId?: string;
  imagePath?: string;
  onAttach: (imagePath: string | undefined) => void;
}) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState<ImageNudge | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/image-nudge")
      .then((r) => r.json())
      .then(setNudge)
      .catch(() => {});
  }, []);

  async function generatePrompt() {
    setGenerating(true);
    setError(null);
    try {
      const { prompt: p } = await postJson<{ prompt: string }>("/api/image-prompt", { draft, run_id: runId });
      setPrompt(p);
    } catch (e) {
      setError(`Couldn't generate a prompt: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onAttach(data.image_path);
    } catch (e) {
      setError(`Couldn't attach image: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function copyPrompt() {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-2.5">
      {imagePath && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePath} alt="Attached visual" className="w-full max-w-sm panel-outline" />
          <button className="btn-outline btn-sm mt-2.5" onClick={() => onAttach(undefined)}>
            Remove image
          </button>
        </div>
      )}

      {error && (
        <div
          className="font-mono text-[12.5px] px-3.5 py-2.5"
          style={{ border: "1px solid oklch(0.65 0.2 25 / 0.5)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      {!imagePath && nudge?.shouldNudge && (
        <div className="font-mono text-[12px] text-term-dim">
          {nudge.basedOnData
            ? `→ Posts with images have outperformed text-only for you so far (${nudge.count} tracked). Worth attaching one.`
            : "→ Posts with images tend to get more reach on LinkedIn — worth attaching one."}
        </div>
      )}

      {!imagePath &&
        (!prompt ? (
          <button className="btn-outline btn-sm" disabled={generating} onClick={generatePrompt}>
            {generating ? "Writing prompt..." : "Generate image prompt"}
          </button>
        ) : (
          <div className="panel-outline p-3.5 space-y-2.5">
            <div className="font-mono text-[11px] tracking-[0.06em] text-term-dim uppercase">
              Paste into Gemini or GPT, generate the image, then upload it here
            </div>
            <textarea
              className="terminal-input !p-2.5 text-[13px]"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="flex gap-2.5 flex-wrap items-center">
              <button className="btn-outline btn-sm" onClick={copyPrompt}>
                {copied ? "Copied" : "Copy prompt"}
              </button>
              <button className="btn-outline btn-sm" disabled={generating} onClick={generatePrompt}>
                Regenerate
              </button>
              <label className="btn-primary btn-sm cursor-pointer">
                {uploading ? "Uploading..." : "Upload image"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </label>
            </div>
          </div>
        ))}
    </div>
  );
}
