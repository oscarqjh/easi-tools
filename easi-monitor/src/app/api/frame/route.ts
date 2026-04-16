import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadConfig } from "@/lib/config";
import { getEpisodePath } from "@/lib/data";
import { extractFromZip } from "@/lib/zip";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const ep = request.nextUrl.searchParams.get("ep");
  const step = request.nextUrl.searchParams.get("step");
  const camera = request.nextUrl.searchParams.get("camera") ?? "front";
  const sourcePath = request.nextUrl.searchParams.get("source");

  if (!task || !run || !ep || step === null) {
    return NextResponse.json({ error: "task, run, ep, and step parameters required" }, { status: 400 });
  }

  const config = loadConfig();
  const logsDir = sourcePath ?? config.sources[0]?.path ?? "";

  const stepNum = parseInt(step, 10);
  const filename = `step_${String(stepNum).padStart(4, "0")}_${camera}.png`;
  const epPath = getEpisodePath(logsDir, task, run, ep);

  // Try loose file first
  const loosePath = path.join(epPath, filename);
  if (fs.existsSync(loosePath)) {
    const data = fs.readFileSync(loosePath);
    return new NextResponse(data, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  // Try zip
  const zipData = extractFromZip(epPath, filename);
  if (zipData) {
    return new NextResponse(new Uint8Array(zipData), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  return NextResponse.json({ error: "Frame not found" }, { status: 404 });
}
