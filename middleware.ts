import { NextResponse, type NextRequest } from "next/server";
import { isMySqlPreviewEnabled } from "@/lib/auth/backend-mode";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (isMySqlPreviewEnabled()) {
    // Admin actions are deliberately not supported in this partial preview.
    if (/^\/admin(?:\/|$)/.test(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Server-side requireUser/requireProfile remain the access boundary.
    return NextResponse.next({ request });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
