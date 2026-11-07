import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("standalone deployment configuration", () => {
  it("traces runtime files from the application root for Passenger", () => {
    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.outputFileTracingRoot).toBe(process.cwd());
  });
});
