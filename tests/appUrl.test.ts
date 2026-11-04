import { describe, expect, it } from "vitest";
import { getCanonicalAppOrigin } from "@/lib/app-url";

describe("getCanonicalAppOrigin", () => {
  it("uses a configured public HTTPS origin in production", () => {
    expect(
      getCanonicalAppOrigin("https://zaban.54i.ir", "production"),
    ).toBe("https://zaban.54i.ir");
  });

  it("allows development to use the request origin when APP_URL is absent", () => {
    expect(getCanonicalAppOrigin(undefined, "development")).toBeUndefined();
  });

  it.each([
    [undefined, "APP_URL is required"],
    ["not a URL", "expected an absolute URL"],
    ["http://zaban.54i.ir", "must use HTTPS"],
    ["https://localhost", "public HTTPS origin"],
    ["https://zaban.54i.ir:3000", "without a port"],
    ["https://zaban.54i.ir/app", "must contain only an origin"],
  ])("rejects unsafe production APP_URL values: %s", (value, message) => {
    expect(() => getCanonicalAppOrigin(value, "production")).toThrow(message);
  });
});
