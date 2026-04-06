import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/[id]
 * Public profile for colleagues (authenticated). Same fields as directory.
 */
export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const profileId = String(context.params?.id ?? "").trim();

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
    }

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, branch, department, phone, emergency_contact, avatar_path, hourly_rate, created_at, updated_at"
      )
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      console.error("GET /api/profile/[id]:", error);
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/profile/[id] unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
