import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { loadConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  const task = request.nextUrl.searchParams.get("task");
  const run = request.nextUrl.searchParams.get("run");
  const ep = request.nextUrl.searchParams.get("ep");
  const sourcePath = request.nextUrl.searchParams.get("source");
  const fps = request.nextUrl.searchParams.get("fps") ?? "5";

  if (!task || !run || !ep) {
    return NextResponse.json({ error: "task, run, and ep parameters required" }, { status: 400 });
  }

  const config = loadConfig();
  const logsDir = sourcePath ?? config.sources[0]?.path ?? "";
  const runDir = path.join(logsDir, task, run);

  if (!fs.existsSync(path.join(runDir, "config.json"))) {
    return NextResponse.json({ error: "run directory not found" }, { status: 404 });
  }

  // Output to temp file
  const outputPath = path.join(os.tmpdir(), `easi_export_${task}_${ep}_${Date.now()}.mp4`);

  // Build command
  const scriptDir = path.resolve(process.cwd(), "..");
  const pythonBin = process.env.EASI_PYTHON ?? path.join(process.env.HOME ?? "", ".cache", "easi", "python", "bin", "python");

  // Try to find python with opencv
  const pythonCandidates = [
    process.env.EASI_PYTHON,
    // Common venv locations relative to easi-tools
    path.resolve(scriptDir, "..", ".venv", "bin", "python"),
    path.resolve(scriptDir, ".venv", "bin", "python"),
    "python3",
  ].filter(Boolean) as string[];

  let python = "python3";
  for (const candidate of pythonCandidates) {
    if (fs.existsSync(candidate)) {
      python = candidate;
      break;
    }
  }

  const args = [
    "-m", "autoeval.export_video",
    "--run-dir", runDir,
    "--episode", ep,
    "--output", outputPath,
    "--fps", fps,
  ];

  if (config.maps_dir) {
    args.push("--maps-dir", config.maps_dir);
  }
  if (config.datasets_dir) {
    args.push("--datasets-dir", config.datasets_dir);
  }

  // Run the export script
  return new Promise<NextResponse>((resolve) => {
    const proc = spawn(python, args, {
      cwd: scriptDir,
      env: { ...process.env, PYTHONPATH: scriptDir },
    });

    let stderr = "";
    proc.stderr.on("data", (data) => { stderr += data.toString(); });
    proc.stdout.on("data", (data) => { process.stdout.write(data); });

    proc.on("close", (code) => {
      if (code !== 0 || !fs.existsSync(outputPath)) {
        resolve(NextResponse.json(
          { error: `Export failed (exit code ${code}): ${stderr.slice(-500)}` },
          { status: 500 }
        ));
        return;
      }

      // Read and return the video file
      const videoData = fs.readFileSync(outputPath);
      // Clean up temp file
      fs.unlinkSync(outputPath);

      resolve(new NextResponse(videoData, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${task}_${ep}.mp4"`,
          "Content-Length": String(videoData.length),
        },
      }));
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      proc.kill();
      resolve(NextResponse.json({ error: "Export timed out" }, { status: 504 }));
    }, 300000);
  });
}
