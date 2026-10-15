import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { accountDestination } from "@/lib/admin/model";
import { isProfileComplete } from "@/lib/daily/lesson";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

const protectedRoutes = [
  "/dashboard",
  "/practice",
  "/conversation",
  "/progress",
  "/mistakes",
];
const onboardingRoute = "/onboarding";

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

async function getAccount(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("users_profile")
    .select("level,goal,daily_minutes,timezone,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const adminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const statusRoute = [
    "/approval-pending",
    "/account-suspended",
    "/account-rejected",
  ].includes(pathname);
  const protectedRoute =
    isProtectedRoute(pathname) ||
    pathname === onboardingRoute ||
    adminRoute ||
    statusRoute;
  function go(destination: string) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  }
  if (!user && protectedRoute) return go("/login");
  if (user && (protectedRoute || isAuthRoute(pathname))) {
    const profile = await getAccount(supabase, user.id);
    const destination = accountDestination(profile?.status);
    if (destination)
      return pathname === destination ? supabaseResponse : go(destination);
    if (adminRoute && user.app_metadata?.role !== "admin")
      return go("/dashboard");
    if (isAuthRoute(pathname) || statusRoute) return go("/dashboard");
    if (
      !adminRoute &&
      !isProfileComplete(profile) &&
      isProtectedRoute(pathname)
    )
      return go(onboardingRoute);
    if (isProfileComplete(profile) && pathname === onboardingRoute)
      return go("/dashboard");
  }
  return supabaseResponse;
}
