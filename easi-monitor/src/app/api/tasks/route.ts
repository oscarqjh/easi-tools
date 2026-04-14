import { NextResponse } from "next/server";
import { getLogsDir, discoverTasks } from "@/lib/data";

export async function GET() {
  try {
    return NextResponse.json(discoverTasks(getLogsDir()));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
