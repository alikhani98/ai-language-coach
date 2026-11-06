/**
 * Development-only Better Auth administrator authorization probe.
 *
 * This is not a production admin API.
 * Public login, Supabase middleware, and admin pages are unchanged.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isQaEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ZABAN_BETTER_AUTH_DEV_ROUTE === "enabled" &&
    process.env.ZABAN_BETTER_AUTH_ADMIN_QA === "enabled"
  );
}

function safeResponse(status: number): Response {
  return new Response(
    status === 200 ? '{"authorized":true}' : null,
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Vary: "Cookie",
        ...(status === 200
          ? { "Content-Type": "application/json; charset=utf-8" }
          : {}),
      },
    },
  );
}

export async function GET(request: Request): Promise<Response> {
  // The gate must run before importing authentication code.
  // Disabled requests must not initialize Better Auth or MySQL.
  if (!isQaEnabled()) {
    return safeResponse(404);
  }

  try {
    const { resolveBetterAuthAdmin } = await import(
      "@/lib/auth/session"
    );

    const admin = await resolveBetterAuthAdmin(request.headers);

    if (!admin) {
      return safeResponse(401);
    }

    // Do not disclose identities, emails, cookies, or tokens.
    return safeResponse(200);
  } catch {
    // Never expose authentication or database error details.
    return safeResponse(503);
  }
}