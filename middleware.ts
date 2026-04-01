import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight middleware — no Supabase SDK.
 * Checks for auth cookies to decide routing. JWT validation happens server-side.
 * The cookie name follows the pattern: sb-<project-ref>-auth-token
 */

const PUBLIC = new Set(["/", "/login", "/register", "/forgot-password", "/reset-password"]);

function isPublic(p: string) {
  return (
    PUBLIC.has(p) ||
    p.startsWith("/auth") ||
    p.startsWith("/api") ||
    p.startsWith("/images") ||
    p.startsWith("/_next") ||
    p === "/favicon.ico" ||
    p === "/manifest.json" ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(p)
  );
}

function hasAuthCookie(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  return cookies.some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pub = isPublic(pathname);
  const authed = hasAuthCookie(request);

  if (!authed && !pub) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && PUBLIC.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
