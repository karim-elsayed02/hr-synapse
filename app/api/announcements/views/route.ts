import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/announcements/views
 * Body: { announcement_ids: string[] }
 * Records that the current user has viewed the given announcements.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ids: string[] = body.announcement_ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "announcement_ids is required" }, { status: 400 });
  }

  const rows = ids.map((aid) => ({
    announcement_id: aid,
    user_id: user.id,
  }));

  const { error } = await supabase
    .from("announcement_views")
    .upsert(rows, { onConflict: "announcement_id,user_id", ignoreDuplicates: true });

  if (error) {
    console.error("Record announcement views failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
