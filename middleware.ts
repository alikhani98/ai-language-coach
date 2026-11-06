import { NextResponse, type NextRequest } from "next/server";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (isMySqlPreviewEnabled()) {
    // Each admin page and action enforces Better Auth + fresh MySQL admin role
    // on the server. Middleware is intentionally not an authorization boundary.
    return NextResponse.next({ request });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
