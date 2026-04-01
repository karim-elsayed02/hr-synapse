import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Supabase session cookies — use only in middleware.
 * Returns the response you must return so Set-Cookie merges apply.
 *
 * setAll must never throw: Edge middleware crashes with MIDDLEWARE_INVOCATION_FAILED if it does
 * (including inside Supabase's onAuthStateChange → applyServerStorage).
 */
export function createSupabaseMiddlewareClient(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient> | null;
  response: NextResponse;
  error: string | null;
} {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      supabase: null,
      response,
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            try {
              response.cookies.set(name, value, options ?? {});
            } catch (e) {
              console.error("[middleware] cookies.set failed:", name, e);
            }
          }
        } catch (e) {
          console.error("[middleware] setAll failed:", e);
        }
      },
    },
  });

  return { supabase, response, error: null };
}
