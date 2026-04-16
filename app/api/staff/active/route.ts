import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

async function getAdminContext() {
  const supabase = createUserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, role: null as string | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role ?? null };
}

/**
 * PATCH { id: string, active: boolean } — admin only; toggles profiles.active
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, role } = await getAdminContext();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    const active = body.active;

    if (!id || typeof active !== "boolean") {
      return NextResponse.json({ error: "id and active (boolean) are required" }, { status: 400 });
    }

    if (id === user.id && active === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    const adminClient = getServiceRoleClient();
    const { error } = await adminClient
      .from("profiles")
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("PATCH /api/staff/active failed:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update account status" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PATCH /api/staff/active unexpected error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
