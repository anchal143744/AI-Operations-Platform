import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** @type {import("next").NextConfig} */
const nextConfig = {
  // ESLint runs as an explicit monorepo CI step using the root flat config.
  eslint: { ignoreDuringBuilds: true },
  // A production build must not remove files used by a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
