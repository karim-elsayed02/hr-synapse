import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my documents:", error);
    return NextResponse.json({ error: "Failed to fetch my documents" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const enriched = (data ?? []).map((doc: Record<string, unknown>) => ({
    ...doc,
    download_url: supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${doc.storage_bucket}/${doc.storage_path}`
      : null,
  }));

  return NextResponse.json(enriched);
}
