import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
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

    // Call the department hierarchy function
    const { data, error } = await supabase.rpc("get_department_hierarchy")

    if (error) {
      console.error("Error fetching departments:", error)
      return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in departments API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
