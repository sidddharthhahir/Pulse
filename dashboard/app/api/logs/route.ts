import { NextResponse } from "next/server";
import { readKb } from "@/lib/knowledge-base";

export async function GET() {
  const content = await readKb("strategy_log");
  return NextResponse.json({ content });
}
