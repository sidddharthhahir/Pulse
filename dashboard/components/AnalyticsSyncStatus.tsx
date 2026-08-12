"use client";

import { useEffect, useState } from "react";

interface AnalyticsSyncStatus {
  granted: boolean;
  detail: string;
  checked_at: string;
}

export default function AnalyticsSyncStatus() {
  const [status, setStatus] = useState<AnalyticsSyncStatus | null | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/analytics-sync")
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setError("Couldn't load sync status."));
  }

  useEffect(load, []);

  async function syncNow() {
    setSyncing(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch("/api/analytics-sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setStatus(data.status);
      setOutput(data.output);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: status?.granted ? "var(--accent)" : "var(--warn)",
            boxShadow: status?.granted ? "0 0 8px oklch(0.82 0.19 150 / 0.8)" : "0 0 8px oklch(0.78 0.16 85 / 0.6)",
          }}
        />
        <span className="font-semibold text-base">Automatic performance sync</span>
      </div>
      <div className="text-term-dim text-sm ml-[18px] leading-relaxed">
        {status === undefined && "Checking..."}
        {status === null &&
          "Never run yet. Once the r_member_postAnalytics permission is granted (apply via LinkedIn's Developer Portal — see integrations/linkedin.py), this fetches impressions/reactions/comments automatically and logs them for you, plus auto-banks posts that beat your average into voice samples."}
        {status && !status.granted &&
          "LinkedIn hasn't granted the analytics permission to this token yet (an application, not instant self-serve). Falling back to manual logging in Drafts until then — everything else in Pulse works fine without it."}
        {status?.granted && "Active — impressions/reactions/comments sync automatically, and posts that outperform your average get auto-banked into voice samples."}
        {status && (
          <div className="font-mono text-[11px] text-term-faint mt-1.5">
            last checked {new Date(status.checked_at).toLocaleString()}
          </div>
        )}
      </div>
      <div className="ml-[18px] mt-3">
        <button className="btn-outline btn-sm" disabled={syncing} onClick={syncNow}>
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>
      {error && <div className="ml-[18px] mt-2 font-mono text-[12px]" style={{ color: "var(--danger)" }}>{error}</div>}
      {output && (
        <pre className="ml-[18px] mt-2 font-mono text-[11.5px] text-term-dim whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
}
