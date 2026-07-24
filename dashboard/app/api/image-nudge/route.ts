import { NextResponse } from "next/server";
import { getImageNudge } from "@/lib/analytics";

export async function GET() {
  try {
    const nudge = await getImageNudge();
    return NextResponse.json(nudge);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
