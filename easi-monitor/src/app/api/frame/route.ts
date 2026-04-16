import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getEpisodePath } from "@/lib/data";
import { extractFromZip } from "@/lib/zip";
import { validateSource, sanitizeSegment } from "@/lib/security";

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

  let logsDir: string;
  let safeTask: string;
  let safeRun: string;
  let safeEp: string;
  try {
    logsDir = validateSource(sourcePath);
    safeTask = sanitizeSegment(task);
    safeRun = sanitizeSegment(run);
    safeEp = sanitizeSegment(ep);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const stepNum = parseInt(step, 10);
  const filename = `step_${String(stepNum).padStart(4, "0")}_${camera}.png`;
  const epPath = getEpisodePath(logsDir, safeTask, safeRun, safeEp);

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
