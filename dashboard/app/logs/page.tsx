import { readKb } from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const content = await readKb("strategy_log");

  return (
    <div className="animate-phase-in">
      <div className="eyebrow mb-2.5">System memory</div>
      <h1 className="text-[38px] font-bold mb-6">Logs</h1>
      <pre className="panel px-8 py-7 whitespace-pre-wrap font-mono text-[13.5px] leading-[1.85] text-term-body">
        {content}
      </pre>
    </div>
  );
}
