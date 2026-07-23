"use client";

import { useState } from "react";

export default function MarkdownField({
  label,
  initialValue,
  onSave,
}: {
  label: string;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = value !== initialValue;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="mono-label">{label}</h3>
        <div className="flex items-center gap-3">
          {error && <span className="font-mono text-[12px]" style={{ color: "var(--danger)" }}>{error}</span>}
          <button
            className="btn-outline btn-sm"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onSave(value);
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
              } catch (e) {
                setError((e as Error).message || "Save failed");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
      <textarea
        className="terminal-input h-[420px] !text-[14px] !leading-[1.9] resize-y"
        style={{ background: "var(--panel)" }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
