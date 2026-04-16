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
  const stream = request.nextUrl.searchParams.get("stream") === "true";

  if (!task || !run || !ep) {
    return NextResponse.json({ error: "task, run, and ep parameters required" }, { status: 400 });
  }

  const config = loadConfig();
  const logsDir = sourcePath ?? config.sources[0]?.path ?? "";
  const runDir = path.join(logsDir, task, run);

  if (!fs.existsSync(path.join(runDir, "config.json"))) {
    return NextResponse.json({ error: "run directory not found" }, { status: 404 });
  }

  const outputPath = path.join(os.tmpdir(), `easi_export_${task}_${ep}_${Date.now()}.mp4`);
  const scriptDir = path.resolve(process.cwd(), "..");

  const pythonCandidates = [
    process.env.EASI_PYTHON,
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

  if (config.maps_dir) args.push("--maps-dir", config.maps_dir);
  if (config.datasets_dir) args.push("--datasets-dir", config.datasets_dir);

  if (stream) {
    // SSE mode: stream progress events, then signal completion
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        const proc = spawn(python, args, {
          cwd: scriptDir,
          env: { ...process.env, PYTHONPATH: scriptDir },
        });

        let stderr = "";
        proc.stderr.on("data", (data) => { stderr += data.toString(); });

        proc.stdout.on("data", (data) => {
          const text = data.toString();
          // Parse progress lines like "[100/740]"
          const match = text.match(/\[(\d+)\/(\d+)\]/);
          if (match) {
            const event = JSON.stringify({ type: "progress", current: parseInt(match[1]), total: parseInt(match[2]) });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          }
        });

        proc.on("close", (code) => {
          if (code !== 0 || !fs.existsSync(outputPath)) {
            const event = JSON.stringify({ type: "error", message: stderr.slice(-500) });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          } else {
            // Encode the video as a download URL via a temp serve endpoint
            const fileId = path.basename(outputPath, ".mp4");
            const event = JSON.stringify({ type: "done", fileId, filename: `${task}_${ep}.mp4` });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          }
          controller.close();
        });

        setTimeout(() => {
          proc.kill();
          const event = JSON.stringify({ type: "error", message: "Export timed out" });
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          controller.close();
        }, 300000);
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Non-stream mode: return video directly
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

      const videoData = fs.readFileSync(outputPath);
      fs.unlinkSync(outputPath);

      resolve(new NextResponse(videoData, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${task}_${ep}.mp4"`,
          "Content-Length": String(videoData.length),
        },
      }));
    });

    setTimeout(() => {
      proc.kill();
      resolve(NextResponse.json({ error: "Export timed out" }, { status: 504 }));
    }, 300000);
  });
}

/** Serve a completed export file by ID. */
export async function POST(request: NextRequest) {
  const { fileId } = await request.json();
  const outputPath = path.join(os.tmpdir(), `${fileId}.mp4`);

  if (!fs.existsSync(outputPath)) {
    return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
  }

  const videoData = fs.readFileSync(outputPath);
  fs.unlinkSync(outputPath);

  return new NextResponse(videoData, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="export.mp4"`,
      "Content-Length": String(videoData.length),
    },
  });
}
