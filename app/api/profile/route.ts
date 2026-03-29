import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileUpdatePayload = {
  full_name?: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  profile_picture?: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

    const updates = {
      full_name: cleanText(body.full_name),
      phone: cleanText(body.phone),
      emergency_contact: cleanText(body.emergency_contact),
      profile_picture: cleanText(body.profile_picture),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(
        "id, email, full_name, role, branch_id, phone, emergency_contact, branch, department, profile_picture"
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

