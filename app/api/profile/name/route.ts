import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProfileUpdatePayload = {
  full_name?: string | null;
  phone?: string | null;
  emergency_contact?: string | null;
  avatar_path?: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
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

    

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      

    if (error) {
      console.error("Profile name fetch error:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to fetch profile name" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      name: data[0].full_name,    
    });
  } catch (error) {
    console.error("Profile name fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

