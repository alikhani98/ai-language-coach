const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Returns the configured public application origin. This deliberately reads
 * only APP_URL so Edge middleware never imports the server secret config.
 */
export function getCanonicalAppOrigin(
  appUrl = process.env.APP_URL,
  environment = process.env.NODE_ENV,
): string | undefined {
  if (!appUrl) {
    if (environment === "production") {
      throw new Error(
        "Invalid APP_URL configuration: APP_URL is required in production.",
      );
    }

    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    throw new Error("Invalid APP_URL configuration: expected an absolute URL.");
  }

  const hasOnlyOriginParts =
    parsed.pathname === "/" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.username === "" &&
    parsed.password === "";

  if (!hasOnlyOriginParts) {
    throw new Error(
      "Invalid APP_URL configuration: APP_URL must contain only an origin.",
    );
  }

  if (environment === "production") {
    if (parsed.protocol !== "https:") {
      throw new Error(
        "Invalid APP_URL configuration: APP_URL must use HTTPS in production.",
      );
    }

    if (parsed.port || LOOPBACK_HOSTS.has(parsed.hostname)) {
      throw new Error(
        "Invalid APP_URL configuration: APP_URL must be a public HTTPS origin without a port.",
      );
    }
  }

  return parsed.origin;
}
