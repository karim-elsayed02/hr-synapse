import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pub = isPublic(pathname);

  // Build the response that will carry any refreshed session cookies.
  let response = NextResponse.next({ request: { headers: request.headers } });

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // Env vars missing — let the request through so pages can render their own error.
      return response;
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Must never throw — an unhandled error here crashes Edge middleware on Vercel.
          for (const c of cookiesToSet) {
            try {
              response.cookies.set(c.name, c.value, c.options ?? {});
            } catch {
              // cookie too large / invalid — skip silently
            }
          }
        },
      },
    });

    // getUser() validates the JWT; refreshes the session if needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).auth.getUser();

    const user = error ? null : data?.user ?? null;

    // Not logged in → redirect protected routes to /login
    if (!user && !pub) {
      return redirect(request, "/login", response);
    }

    // Logged in → bounce auth pages to /dashboard
    if (user && PUBLIC.has(pathname)) {
      return redirect(request, "/dashboard", response);
    }

    return response;
  } catch (e) {
    console.error("[middleware]", e);
    // On any unexpected error let public pages through; redirect protected ones.
    if (pub) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

/** Redirect while preserving any Set-Cookie headers the Supabase client wrote. */
function redirect(request: NextRequest, to: string, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  const res = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    try {
      res.cookies.set(cookie);
    } catch {
      // skip
    }
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
