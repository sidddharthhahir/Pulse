import { NextResponse } from "next/server";
import { getTokenMeta, recordTokenIssuedNow } from "@/lib/linkedin-token";

export async function GET() {
  try {
    const meta = await getTokenMeta();
    return NextResponse.json({ meta });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const meta = await recordTokenIssuedNow();
    return NextResponse.json({ meta });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
