import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

/**
 * Handles Supabase email-link confirmation:
 *   GET /auth/confirm?token_hash=XXX&type=recovery
 *   GET /auth/confirm?token_hash=XXX&type=invite
 *   GET /auth/confirm?token_hash=XXX&type=signup
 *   GET /auth/confirm?token_hash=XXX&type=email
 *
 * Supabase email templates use {{ .ConfirmationURL }} which resolves to this path.
 * After verifying the token we redirect to the appropriate page.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? url.origin).replace(/\/$/, "");

  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${siteBase}/login?error=${encodeURIComponent("Invalid or expired link.")}`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${siteBase}/login?error=missing_config`);
  }

  const DESTINATION: Record<string, string> = {
    recovery: "/reset-password",
    invite: "/set-password",
    signup: "/dashboard",
    email: "/dashboard",
    email_change: "/dashboard",
    magiclink: "/dashboard",
  };

  const destination = next ?? DESTINATION[type] ?? "/dashboard";

  let res = NextResponse.redirect(`${siteBase}${destination}`);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        res = NextResponse.redirect(`${siteBase}${destination}`);
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as "recovery" | "invite" | "signup" | "magiclink" | "email_change" | "email",
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp error:", error.message);
    return NextResponse.redirect(
      `${siteBase}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return res;
}
