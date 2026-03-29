import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, branch, department, phone, emergency_contact")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Session profile fetch error:", profileError);
      return NextResponse.json({ success: false, user: null }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email ?? null,
        full_name: profile?.full_name ?? null,
        role: profile?.role ?? "staff",
        branch: profile?.branch ?? null,
        department: profile?.department ?? null,
        phone: profile?.phone ?? null,
        emergency_contact: profile?.emergency_contact ?? null,
      },
    });
  } catch (error) {
    console.error("Session route error:", error);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
