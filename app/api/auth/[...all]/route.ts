/**
 * Better Auth API integration.
 *
 * Deliberately disabled outside development.
 * Production remains on the existing Supabase auth path.
 *
 * Never expose this route in production without a separate
 * security review, authorization integration, and cutover plan.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEnabled(): boolean {
  // Controlled production cutover shares the same double opt-in as server data access.
  if (process.env.NODE_ENV === "production") {
    return process.env.ZABAN_DATA_BACKEND === "mysql" && process.env.ZABAN_CUTOVER_APPROVED === "yes";
  }
  return process.env.NODE_ENV === "development" && process.env.ZABAN_BETTER_AUTH_DEV_ROUTE === "enabled";
}

async function handle(request: Request): Promise<Response> {
  if (!isEnabled()) {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  // Import only after the guard passes. Disabled requests must
  // never initialize Better Auth or open a MySQL connection.
  const { getBetterAuth } = await import(
    "@/lib/auth/better-auth"
  );

  return getBetterAuth().handler(request);
}

export const GET = handle;
export const POST = handle;