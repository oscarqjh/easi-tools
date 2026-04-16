import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { TTLCache } from "./cache";

const zipCache = new TTLCache<AdmZip>();

export function extractFromZip(episodePath: string, filename: string): Buffer | null {
  const zipPath = path.join(episodePath, "images.zip");
  if (!fs.existsSync(zipPath)) return null;

  let zip = zipCache.get(zipPath);
  if (!zip) {
    try {
      zip = new AdmZip(zipPath);
      zipCache.set(zipPath, zip, 300_000); // 5 min TTL
    } catch { return null; }
  }

  try {
    const entry = zip.getEntry(filename);
    if (!entry) return null;
    return entry.getData();
  } catch { return null; }
}
