import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
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

async function getHasProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("users_profile")
    .select("level,goal,daily_minutes,timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return isProfileComplete(data);
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

  if (!user && (isProtectedRoute(pathname) || pathname === onboardingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user) {
    const hasProfile = await getHasProfile(supabase, user.id);

    if (!hasProfile && isProtectedRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = onboardingRoute;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (hasProfile && pathname === onboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
