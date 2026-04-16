import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { discoverTasks } from "@/lib/data";

export async function GET() {
  try {
    const config = loadConfig();
    const allTasks = [];
    for (const source of config.sources) {
      const tasks = discoverTasks(source.path);
      for (const task of tasks) {
        allTasks.push({ ...task, source: source.name, sourcePath: source.path });
      }
    }
    return NextResponse.json(allTasks);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
