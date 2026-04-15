import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attachSignedDownloadUrls } from "@/lib/documents-download-urls";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .eq("scope", "employee")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my documents:", error);
    return NextResponse.json({ error: "Failed to fetch my documents" }, { status: 500 });
  }

  const enriched = await attachSignedDownloadUrls(supabase, (data ?? []) as Record<string, unknown>[]);

  return NextResponse.json(enriched);
}
