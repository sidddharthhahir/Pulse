import { NextResponse } from "next/server";
import { getRunUsage, estimateCostUsd } from "@/lib/usage";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const usage = await getRunUsage(params.id);
    return NextResponse.json({ usage, cost_usd: usage ? estimateCostUsd(usage) : 0 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
