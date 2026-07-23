"use client";

import { useEffect, useState } from "react";
import { TokenMeta, daysRemaining } from "@/lib/token-lifetime";

export default function TokenStatus({ hasToken }: { hasToken: boolean }) {
  const [meta, setMeta] = useState<TokenMeta | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/linkedin-token")
      .then((r) => r.json())
      .then((d) => setMeta(d.meta))
      .catch(() => setMeta(null));
  }, []);

  async function markIssuedNow() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/linkedin-token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to record token date");
      const d = await res.json();
      setMeta(d.meta);
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!hasToken || meta === undefined) return null;

  if (meta === null) {
    return (
      <div
        className="px-5 py-4 flex justify-between items-center flex-wrap gap-3"
        style={{ border: "1px solid oklch(0.78 0.16 85 / 0.4)" }}
      >
        <span className="font-mono text-sm" style={{ color: "var(--warn)" }}>
          {error ?? "Token issue date unknown — can't warn you before it expires."}
        </span>
        <button className="btn-outline btn-sm shrink-0" disabled={saving} onClick={markIssuedNow}>
          {saving ? "Saving..." : "I just added this token"}
        </button>
      </div>
    );
  }

  const remaining = daysRemaining(meta);
  const soon = remaining <= 7;

  return (
    <div
      className="px-5 py-4 flex justify-between items-center flex-wrap gap-3"
      style={{ border: soon ? "1px solid oklch(0.65 0.2 25 / 0.5)" : "1px solid var(--border-soft)" }}
    >
      <span className="font-mono text-sm" style={{ color: soon ? "var(--danger)" : "oklch(0.75 0.01 90)" }}>
        {error ??
          `LinkedIn token: ${remaining} day${remaining === 1 ? "" : "s"} left (issued ${new Date(meta.issued_at).toLocaleDateString()})${
            soon ? " — refresh it soon or publishing will start failing." : ""
          }`}
      </span>
      <button className="btn-outline btn-sm shrink-0" disabled={saving} onClick={markIssuedNow}>
        {saving ? "Saving..." : "I refreshed it today"}
      </button>
    </div>
  );
}
