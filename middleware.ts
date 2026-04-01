import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "./lib/supabase/middleware";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)
  );
}

/** Redirect while copying Set-Cookie from the Supabase middleware response (session refresh). */
function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirect = NextResponse.redirect(url);
  try {
    for (const c of from.cookies.getAll()) {
      try {
        redirect.cookies.set(c);
      } catch (e) {
        console.error("[middleware] redirect cookies.set failed:", c.name, e);
      }
    }
  } catch (e) {
    console.error("[middleware] redirect cookie merge failed:", e);
  }
  return redirect;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicPath = isPublicPath(pathname);

  try {
    const { supabase, response, error } = createSupabaseMiddlewareClient(request);

    if (error || !supabase) {
      return response;
    }

    // Call real getUser — avoid importing types that break on Vercel/pnpm.
    const auth = supabase.auth as {
      getUser: () => Promise<{
        data: { user: { id: string } | null } | null;
        error: { message?: string } | null;
      }>;
    };

    let data: { user: { id: string } | null } | null = null;
    let authError: { message?: string } | null = null;

    try {
      const result = await auth.getUser();
      data = result?.data ?? null;
      authError = result?.error ?? null;
    } catch (e) {
      console.error("[middleware] getUser threw:", e);
      if (!publicPath) {
        return redirectWithCookies(request, "/login", response);
      }
      return response;
    }

    if (authError) {
      console.error("[middleware] getUser:", authError.message ?? authError);
      if (!publicPath) {
        return redirectWithCookies(request, "/login", response);
      }
      return response;
    }

    const user = data?.user ?? null;

    if (!user && !publicPath) {
      return redirectWithCookies(request, "/login", response);
    }

    if (
      user &&
      (pathname === "/" ||
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password")
    ) {
      return redirectWithCookies(request, "/dashboard", response);
    }

    return response;
  } catch (err) {
    console.error("[middleware] uncaught:", err);
    if (publicPath) {
      return NextResponse.next({
        request: { headers: request.headers },
      });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
