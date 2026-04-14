import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";

export function extractFromZip(episodePath: string, filename: string): Buffer | null {
  const zipPath = path.join(episodePath, "images.zip");
  if (!fs.existsSync(zipPath)) return null;
  try {
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry(filename);
    if (!entry) return null;
    return entry.getData();
  } catch { return null; }
}
