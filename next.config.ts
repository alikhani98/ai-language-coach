
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

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
