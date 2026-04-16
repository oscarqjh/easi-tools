import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { loadConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  const sourcePath = request.nextUrl.searchParams.get("source");
  const filename = request.nextUrl.searchParams.get("file");

  const config = loadConfig();
  const logsDir = sourcePath ?? config.sources[0]?.path ?? "";

  if (filename) {
    // Serve a specific TSV file
    const tsvPath = path.join(logsDir, filename);
    if (!fs.existsSync(tsvPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const data = fs.readFileSync(tsvPath, "utf-8");
    return new NextResponse(data, {
      headers: {
        "Content-Type": "text/tab-separated-values",
        "Content-Disposition": `attachment; filename="${path.basename(filename)}"`,
      },
    });
  }

  // List all benchmark TSV files in the source directory
  if (!fs.existsSync(logsDir)) {
    return NextResponse.json([]);
  }

  const files = fs.readdirSync(logsDir)
    .filter((f) => f.startsWith("benchmark_") && f.endsWith(".tsv"))
    .map((f) => ({
      name: f,
      size: fs.statSync(path.join(logsDir, f)).size,
    }));

  return NextResponse.json(files);
}
