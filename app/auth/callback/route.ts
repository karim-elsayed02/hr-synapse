import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeInternalPath(path: string | null): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");
  const type = searchParams.get("type");
  const nextPath = safeInternalPath(searchParams.get("next"));

  if (error) {
    console.error("Auth error:", error, error_description);

    return NextResponse.redirect(
      `${site}/login?error=${encodeURIComponent(
        error_description || "Authentication failed"
      )}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${site}/login`);
  }

  const supabase = createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Session exchange error:", exchangeError);

    return NextResponse.redirect(
      `${site}/login?error=Could not authenticate`
    );
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${site}/reset-password`);
  }
  const destination = nextPath ?? "/dashboard";
  return NextResponse.redirect(`${site}${destination}`);
}
