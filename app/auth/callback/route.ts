import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

function safeInternalPath(path: string | null): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/** Email link verification types Supabase may pass as `type` with `token_hash`. */
const OTP_TYPES = new Set([
  "invite",
  "signup",
  "recovery",
  "magiclink",
  "email_change",
  "email",
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? url.origin).replace(
    /\/$/,
    ""
  );

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");
  const nextPath = safeInternalPath(url.searchParams.get("next")) ?? "/dashboard";

  if (error) {
    console.error("Auth error:", error, error_description);

    return NextResponse.redirect(
      `${siteBase}/login?error=${encodeURIComponent(
        error_description || "Authentication failed"
      )}`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${siteBase}/login?error=missing_config`);
  }

  /** Password reset via email uses recovery; invite/signup honor `next` (e.g. /set-password). */
  const destinationPath =
    typeParam === "recovery" ? "/reset-password" : nextPath;

  const redirectWithCookies = (path: string) => {
    return NextResponse.redirect(`${siteBase}${path}`);
  };

  if (code) {
    let res = redirectWithCookies(destinationPath);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          res = redirectWithCookies(destinationPath);
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange error:", exchangeError);
      return NextResponse.redirect(
        `${siteBase}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    return res;
  }

  if (token_hash && typeParam && OTP_TYPES.has(typeParam)) {
    let res = redirectWithCookies(destinationPath);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          res = redirectWithCookies(destinationPath);
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: typeParam as
        | "invite"
        | "signup"
        | "recovery"
        | "magiclink"
        | "email_change"
        | "email",
    });

    if (verifyError) {
      console.error("verifyOtp error:", verifyError);
      return NextResponse.redirect(
        `${siteBase}/login?error=${encodeURIComponent(verifyError.message)}`
      );
    }

    return res;
  }

  console.error(
    "Auth callback missing code and token_hash. URL:",
    request.url.split("?")[0]
  );

  return NextResponse.redirect(
    `${siteBase}/login?error=${encodeURIComponent(
      "Invalid or expired link. Request a new invite from your admin."
    )}`
  );
}
