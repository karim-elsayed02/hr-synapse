import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] })
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Not needed for GET requests
          },
        },
      },
    )

    // Search staff members
    const { data: staffResults, error: staffError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, department, branch")
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%,department.ilike.%${query}%`)
      .limit(10)

    if (staffError) {
      console.error("[v0] Search error:", staffError)
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    // Format results
    const results = [
      ...staffResults.map((staff) => ({
        id: staff.id,
        type: "staff",
        title: staff.full_name || staff.email,
        subtitle: `${staff.role} ${staff.department ? `• ${staff.department}` : ""}`,
        url: `/staff`,
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Search API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
