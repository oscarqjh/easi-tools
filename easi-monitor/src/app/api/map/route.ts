import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadConfig, getTaskConfig } from "@/lib/config";
import { sanitizeSegment } from "@/lib/security";

export async function GET(request: NextRequest) {
  const scene = request.nextUrl.searchParams.get("scene");
  const floor = request.nextUrl.searchParams.get("floor");
  const meta = request.nextUrl.searchParams.get("meta");
  const task = request.nextUrl.searchParams.get("task");

  if (!scene) return NextResponse.json({ error: "scene required" }, { status: 400 });

  let safeScene: string;
  try {
    safeScene = sanitizeSegment(scene);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const config = loadConfig();
  const taskConfig = task ? getTaskConfig(config, task) : null;
  const mapsDir = taskConfig?.maps_dir;
  if (!mapsDir) return NextResponse.json({ error: "maps_dir not configured for this task" }, { status: 404 });

  const sceneDir = path.join(mapsDir, safeScene);
  if (!fs.existsSync(sceneDir)) return NextResponse.json({ error: "scene not found" }, { status: 404 });

  if (meta === "true") {
    const result: Record<string, unknown> = {};
    const rpPath = path.join(sceneDir, "render_params.json");
    if (fs.existsSync(rpPath)) result.render_params = JSON.parse(fs.readFileSync(rpPath, "utf-8"));
    const fhPath = path.join(sceneDir, "floor_heights.json");
    if (fs.existsSync(fhPath)) result.floor_heights = JSON.parse(fs.readFileSync(fhPath, "utf-8"));
    return NextResponse.json(result);
  }

  // Serve floor image
  const floorNum = floor ?? "1";
  const imgPath = path.join(sceneDir, `topdown_rgb_floor_${floorNum}.png`);
  if (!fs.existsSync(imgPath)) return NextResponse.json({ error: "floor image not found" }, { status: 404 });

  const data = fs.readFileSync(imgPath);
  return new NextResponse(data, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
