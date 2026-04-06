import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"

function parseAssignedHours(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            /* ignore when called from static context */
          }
        },
      },
    },
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 })
  }

  if (profile.role !== "admin" && profile.role !== "branch_lead") {
    return NextResponse.json({ error: "Only admins and branch leads can create tasks" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const title = String(body.title ?? "").trim()
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const descRaw = body.description
  const description =
    typeof descRaw === "string" && descRaw.trim() ? descRaw.trim() : null

  const branchRaw = body.branchId ?? body.branch_id
  const subRaw = body.subBranchId ?? body.sub_branch_id
  const branch_id =
    typeof branchRaw === "string" && branchRaw.trim() ? branchRaw.trim() : null
  const sub_branch_id =
    typeof subRaw === "string" && subRaw.trim() ? subRaw.trim() : null

  const dueRaw = body.dueDate ?? body.due_date
  const due_date =
    typeof dueRaw === "string" && dueRaw.trim() ? dueRaw.trim() : null

  const assigned_hours = parseAssignedHours(body.assignedHours ?? body.assigned_hours)

  const is_admin = body.is_admin === true

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      branch_id,
      sub_branch_id,
      assigned_hours,
      due_date,
      is_admin,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[create-tasks]", error)
    return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 })
  }

  revalidatePath("/tasks")

  return NextResponse.json({ success: true, task: data })
}
