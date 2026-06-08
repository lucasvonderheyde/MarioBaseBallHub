import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Keep Turbopack/postcss resolving deps from `web/`, not the parent repo folder. */
const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Native addon — must not be webpack-bundled or Node cannot load the .node binary.
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: appDir,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
