import fs from "fs";
import dotenv from "dotenv";
import { readKb } from "@/lib/knowledge-base";
import { ENV_PATH } from "@/lib/paths";
import { getPerformanceStatus } from "@/lib/analytics";
import TokenStatus from "@/components/TokenStatus";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (fs.existsSync(ENV_PATH)) {
    dotenv.config({ path: ENV_PATH });
  }
  const profile = await readKb("profile");
  const publishingMatch = profile.match(/## Publishing\s*\n([\s\S]*?)(\n##|$)/);
  const publishing = publishingMatch ? publishingMatch[1].trim() : "unset";

  const hasClaudeKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasLinkedIn = Boolean(process.env.LINKEDIN_ACCESS_TOKEN);
  const performance = await getPerformanceStatus();

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">Configuration</div>
      <h1 className="text-[38px] font-bold mb-6">Settings</h1>

      <div className="panel px-8 py-7 mb-6 space-y-6">
        <StatusRow label="Claude API key" ok={hasClaudeKey} okText="Set" badText="Not set — add ANTHROPIC_API_KEY to the repo-root .env" />
        <div>
          <StatusRow
            label="LinkedIn"
            ok={hasLinkedIn}
            okText="Connected — publishing goes live"
            badText="Not connected — publish runs in dry-run mode"
          />
          <div className="mt-4">
            <TokenStatus hasToken={hasLinkedIn} />
          </div>
        </div>
        <div>
          <div className="font-semibold text-[15px] mb-2">Publishing target (from profile.md)</div>
          <div className="text-term-muted text-sm leading-relaxed">{publishing}</div>
        </div>
        <StatusRow
          label="Performance learning"
          ok={performance.active}
          okText={`Active — ranking and hooks now favor what's worked across ${performance.count} scored posts`}
          badText={`Not active yet — ${performance.count}/${performance.threshold} posts logged. Log performance in Drafts to activate.`}
        />
      </div>

      <div className="panel-outline px-8 py-7 mb-6">
        <div className="font-semibold text-base mb-1.5">Backup</div>
        <p className="text-term-dim text-sm leading-relaxed mb-4">
          Your voice, rules, and run history live only on this machine. Download a zip of{" "}
          <span className="font-mono">knowledge_base/</span> and <span className="font-mono">pipeline_state/</span> —
          keep it somewhere that isn&apos;t this laptop.
        </p>
        <a href="/api/export" className="btn-outline btn-sm no-underline hover:no-underline inline-block">
          Export backup (.zip)
        </a>
      </div>

      <p className="text-[13px] text-term-faint">
        Secrets are never displayed here — only whether they&apos;re set. Edit{" "}
        <span className="font-mono">.env</span> directly to change them.
      </p>
    </div>
  );
}

function StatusRow({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: ok ? "var(--accent)" : "var(--warn)",
            boxShadow: ok ? "0 0 8px oklch(0.82 0.19 150 / 0.8)" : "0 0 8px oklch(0.78 0.16 85 / 0.6)",
          }}
        />
        <span className="font-semibold text-base">{label}</span>
      </div>
      <div className="text-term-dim text-sm ml-[18px]">{ok ? okText : badText}</div>
    </div>
  );
}
