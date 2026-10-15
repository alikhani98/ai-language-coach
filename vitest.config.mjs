import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    isolate: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd()),
    },
  },
});
