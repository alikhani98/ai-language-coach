
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Passenger starts the copied standalone output from a deployment directory.
  // Keep tracing rooted at this repository so runtime server dependencies are
  // included before `scripts/prepare-standalone.mjs` copies the artifact.
  outputFileTracingRoot: process.cwd(),

  experimental: {
    // Limit build workers for shared hosting environments.
    cpus: 1,
    workerThreads: false,

    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
