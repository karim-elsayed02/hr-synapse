import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { isStaffProfileRole } from "@/lib/utils/permissions";
import { validateProfileBranchDept } from "@/lib/utils/org-structure";

export const dynamic = "force-dynamic";

function parseHourlyRate(
  input: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (input === undefined || input === null || input === "") {
    return { ok: true, value: null };
  }
  const n = typeof input === "number" ? input : parseFloat(String(input).trim());
  if (Number.isNaN(n)) {
    return { ok: false, error: "Invalid hourly rate" };
  }
  if (n < 0) {
    return { ok: false, error: "Hourly rate cannot be negative" };
  }
  return { ok: true, value: n };
}

/** Invite link must match Supabase Auth → URL configuration redirect allowlist. */
function getInviteRedirectTo(request: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envBase) {
    return `${envBase}/auth/callback?next=${encodeURIComponent("/set-password")}`;
  }
  try {
    const origin = new URL(request.url).origin;
    return `${origin}/auth/callback?next=${encodeURIComponent("/set-password")}`;
  } catch {
    return "/auth/callback?next=/set-password";
  }
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
        "id, full_name, email, role, branch, department, phone, emergency_contact, hourly_rate, avatar_path, active, created_at, updated_at"
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
    const newRole = String(body.role ?? "staff").trim();
    const phone = String(body.phone ?? "").trim() || null;
    const emergency_contact = String(body.emergency_contact ?? "").trim() || null;

    if (!full_name || !email) {
      return NextResponse.json(
        { error: "Full name and email are required" },
        { status: 400 }
      );
    }

    if (!isStaffProfileRole(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const branchDept = validateProfileBranchDept(body.branch, body.department);
    if (!branchDept.ok) {
      return NextResponse.json({ error: branchDept.error }, { status: 400 });
    }
    const { branch, department } = branchDept;

    const rateParsed = parseHourlyRate(body.hourly_rate);
    if (!rateParsed.ok) {
      return NextResponse.json({ error: rateParsed.error }, { status: 400 });
    }

    const adminClient = getServiceRoleClient();

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: getInviteRedirectTo(request),
        data: { full_name },
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
        hourly_rate: rateParsed.value,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Profile upsert failed after invite:", profileError);
      await adminClient.auth.admin.deleteUser(invitedUserId);
      return NextResponse.json(
        { error: profileError.message || "Failed to create profile" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, userId: invitedUserId });
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
    const newRole = String(body.role ?? "staff").trim();

    if (!full_name) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    if (!isStaffProfileRole(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const adminClient = getServiceRoleClient();

    const branchDept = validateProfileBranchDept(body.branch, body.department);
    if (!branchDept.ok) {
      return NextResponse.json({ error: branchDept.error }, { status: 400 });
    }

    const rateParsed = parseHourlyRate(body.hourly_rate);
    if (!rateParsed.ok) {
      return NextResponse.json({ error: rateParsed.error }, { status: 400 });
    }

    const { error } = await adminClient
      .from("profiles")
      .update({
        full_name,
        role: newRole,
        branch: branchDept.branch,
        department: branchDept.department,
        phone: String(body.phone ?? "").trim() || null,
        emergency_contact: String(body.emergency_contact ?? "").trim() || null,
        hourly_rate: rateParsed.value,
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

/** Create auth user + profile. Admin shares the password out-of-band; no email is sent. */
export async function PUT(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUserAndRole();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const password = String(body.password ?? "").trim();

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const full_name = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const newRole = String(body.role ?? "staff").trim();
    const phone = String(body.phone ?? "").trim() || null;
    const emergency_contact = String(body.emergency_contact ?? "").trim() || null;

    if (!full_name || !email) {
      return NextResponse.json(
        { error: "Full name and email are required" },
        { status: 400 }
      );
    }

    if (!isStaffProfileRole(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const branchDept = validateProfileBranchDept(body.branch, body.department);
    if (!branchDept.ok) {
      return NextResponse.json({ error: branchDept.error }, { status: 400 });
    }
    const { branch, department } = branchDept;

    const rateParsed = parseHourlyRate(body.hourly_rate);
    if (!rateParsed.ok) {
      return NextResponse.json({ error: rateParsed.error }, { status: 400 });
    }

    const adminClient = getServiceRoleClient();

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("createUser failed:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create user" },
        { status: 400 }
      );
    }

    const newUserId = created.user?.id;
    if (!newUserId) {
      return NextResponse.json(
        { error: "User was created but no user ID was returned" },
        { status: 500 }
      );
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        full_name,
        email,
        role: newRole,
        branch,
        department,
        phone,
        emergency_contact,
        hourly_rate: rateParsed.value,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Profile upsert failed after createUser:", profileError);
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: profileError.message || "Failed to create profile" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: newUserId,
    });
  } catch (error) {
    console.error("PUT /api/staff unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
