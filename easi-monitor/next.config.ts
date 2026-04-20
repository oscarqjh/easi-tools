import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["sharp", "adm-zip", "js-yaml"],
};

export default nextConfig;
