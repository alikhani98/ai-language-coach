
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Passenger starts the copied standalone output from a deployment directory.
  // Keep tracing rooted at this repository so runtime server dependencies are
  // included before `scripts/prepare-standalone.mjs` copies the artifact.
  outputFileTracingRoot: process.cwd(),
  // These packages are loaded by guarded/dynamic MySQL and Better Auth paths,
  // so Next's static trace does not always see them. Keep this list explicit;
  // do not copy the full dependency tree or development dependencies.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/mysql2/**/*", "./node_modules/aws-ssl-profiles/**/*",
      "./node_modules/generate-function/**/*", "./node_modules/iconv-lite/**/*",
      "./node_modules/long/**/*", "./node_modules/lru.min/**/*",
      "./node_modules/named-placeholders/**/*", "./node_modules/sql-escaper/**/*",
      "./node_modules/safer-buffer/**/*",
      "./node_modules/sharp/**/*", "./node_modules/@img/**/*",
      "./node_modules/better-auth/**/*", "./node_modules/@better-auth/**/*",
      "./node_modules/@better-fetch/**/*", "./node_modules/@noble/**/*",
      "./node_modules/better-call/**/*", "./node_modules/defu/**/*",
      "./node_modules/jose/**/*", "./node_modules/kysely/**/*",
      "./node_modules/nanostores/**/*", "./node_modules/drizzle-orm/**/*",
      "./node_modules/zod/**/*",
    ],
  },

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
