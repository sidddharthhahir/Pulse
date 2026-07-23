import { NextResponse } from "next/server";
import { getTokenMeta, recordTokenIssuedNow } from "@/lib/linkedin-token";

export async function GET() {
  const meta = await getTokenMeta();
  return NextResponse.json({ meta });
}

export async function POST() {
  const meta = await recordTokenIssuedNow();
  return NextResponse.json({ meta });
}
