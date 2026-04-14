import { NextRequest, NextResponse } from "next/server";
import { getLogsDir, readTrajectory } from "@/lib/data";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const ep = request.nextUrl.searchParams.get("ep");
  if (!task || !run || !ep) return NextResponse.json({ error: "task, run, and ep parameters required" }, { status: 400 });
  try {
    return NextResponse.json(readTrajectory(getLogsDir(), task, run, ep));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
