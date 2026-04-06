import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileUpdatePayload = {
  full_name?: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  avatar_path?: string | null;
  /** Admins only: own profile */
  hourly_rate?: number | string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseHourlyRate(
  input: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (input === null || input === "") {
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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ProfileUpdatePayload;

    const { data: currentProfile, error: profileReadError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileReadError || !currentProfile) {
      return NextResponse.json(
        { success: false, error: "Could not load profile" },
        { status: 500 }
      );
    }

    const isAdmin = currentProfile.role === "admin";

    const updates: Record<string, unknown> = {
      full_name: cleanText(body.full_name),
      phone: cleanText(body.phone),
      emergency_contact: cleanText(body.emergency_contact),
      avatar_path: cleanText(body.avatar_path),
      updated_at: new Date().toISOString(),
    };

    if (body.hourly_rate !== undefined && isAdmin) {
      const parsed = parseHourlyRate(body.hourly_rate);
      if (!parsed.ok) {
        return NextResponse.json(
          { success: false, error: parsed.error },
          { status: 400 }
        );
      }
      updates.hourly_rate = parsed.value;
    }
    // Non-admins: hourly_rate in the body is ignored (cannot update this field)

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(
        "id, email, full_name, role, phone, emergency_contact, branch, department, avatar_path, hourly_rate"
      )
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    console.error("Profile PATCH route error:", error);
    return NextResponse.json(
      { success: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

