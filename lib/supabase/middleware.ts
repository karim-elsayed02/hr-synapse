import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export type MiddlewareSupabase = SupabaseClient

/**
 * Supabase browser session cookies — use only in middleware.
 * Returns the response you must return from middleware so Set-Cookie merges apply.
 */
export function createSupabaseMiddlewareClient(request: NextRequest): {
  supabase: MiddlewareSupabase | null
  response: NextResponse
  error: string | null
} {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      supabase: null,
      response,
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    }
  }

  const supabase: MiddlewareSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  return { supabase, response, error: null as string | null }
}
