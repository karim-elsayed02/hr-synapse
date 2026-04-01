import { type NextRequest, NextResponse } from "next/server"
import type { GoTrueClient } from "@supabase/auth-js"
// Use a relative import so the Edge bundle resolves on Vercel (path aliases in middleware can fail).
import { createSupabaseMiddlewareClient } from "./lib/supabase/middleware"

/** Runtime auth client always exposes getUser; some TS versions narrow `auth` to a stub. */
type GoTrueAuth = InstanceType<typeof GoTrueClient>

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
])

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
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const publicPath = isPublicPath(pathname)

  try {
    const { supabase, response, error } = createSupabaseMiddlewareClient(request)

    if (error || !supabase) {
      return response
    }

    const { data, error: authError } = await (
      supabase.auth as unknown as GoTrueAuth
    ).getUser()

    if (authError) {
      console.error("[middleware] getUser:", authError.message)
      if (!publicPath) {
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        return NextResponse.redirect(url)
      }
      return response
    }

    const user = data.user

    if (!user && !publicPath) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    if (
      user &&
      (pathname === "/" ||
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password")
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    return response
  } catch (err) {
    console.error("[middleware] uncaught:", err)
    if (publicPath) {
      return NextResponse.next({ request })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
