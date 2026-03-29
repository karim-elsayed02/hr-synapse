import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Get current user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId, branch, department } = await request.json()

    if (!userId || !branch || !department) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update user's department assignment
    const { error } = await supabase
      .from("profiles")
      .update({
        branch,
        department,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      console.error("Error assigning department:", error)
      return NextResponse.json({ error: "Failed to assign department" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in assign department API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
