import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getAuthenticatedUserAndRole() {
  const supabase = createUserClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, role: null, supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .single();

  return {
    user,
    role: profile?.role ?? null,
    supabase,
  };
}

export async function GET() {
  try {
    const { user, supabase } = await getAuthenticatedUserAndRole();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, branch, department, phone, emergency_contact, created_at, updated_at"
      )
      .order("full_name", { ascending: true });

    if (error) {
      console.error("GET /api/staff failed:", error);
      return NextResponse.json({ error: "Failed to load staff" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("GET /api/staff unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUserAndRole();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();

    const full_name = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const newRole = String(body.role ?? "staff").trim().toLowerCase();
    const branch = String(body.branch ?? "").trim() || null;
    const department = String(body.department ?? "").trim() || null;
    const phone = String(body.phone ?? "").trim() || null;
    const emergency_contact = String(body.emergency_contact ?? "").trim() || null;

    if (!full_name || !email) {
      return NextResponse.json(
        { error: "Full name and email are required" },
        { status: 400 }
      );
    }

    if (!["staff", "manager", "admin"].includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const adminClient = getServiceRoleClient();

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo:
          "https://synapseuk-staff-platform.vercel.app/auth/callback?next=/set-password",
      });

    if (inviteError) {
      console.error("Invite user failed:", inviteError);
      return NextResponse.json(
        { error: inviteError.message || "Failed to invite staff member" },
        { status: 400 }
      );
    }

    const invitedUserId = inviteData.user?.id;

    if (!invitedUserId) {
      return NextResponse.json(
        { error: "User invite succeeded but no user ID was returned" },
        { status: 500 }
      );
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: invitedUserId,
        full_name,
        email,
        role: newRole,
        branch,
        department,
        phone,
        emergency_contact,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Profile upsert failed:", profileError);
      return NextResponse.json(
        { error: profileError.message || "Failed to create profile" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/staff unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUserAndRole();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    const full_name = String(body.full_name ?? "").trim();
    const newRole = String(body.role ?? "staff").trim().toLowerCase();

    if (!full_name) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    if (!["staff", "manager", "admin"].includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const adminClient = getServiceRoleClient();

    const { error } = await adminClient
      .from("profiles")
      .update({
        full_name,
        role: newRole,
        branch: String(body.branch ?? "").trim() || null,
        department: String(body.department ?? "").trim() || null,
        phone: String(body.phone ?? "").trim() || null,
        emergency_contact: String(body.emergency_contact ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Profile update failed:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update staff member" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/staff unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUserAndRole();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    if (id === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account from here" },
        { status: 400 }
      );
    }

    const adminClient = getServiceRoleClient();

    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", id);

    if (deleteProfileError) {
      console.error("Profile delete failed:", deleteProfileError);
      return NextResponse.json(
        { error: deleteProfileError.message || "Failed to delete profile" },
        { status: 400 }
      );
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(id);

    if (deleteUserError) {
      console.error("Auth delete failed:", deleteUserError);
      return NextResponse.json(
        {
          error:
            deleteUserError.message ||
            "Profile deleted, but failed to delete auth user",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/staff unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
