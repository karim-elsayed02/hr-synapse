import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { TASK_ATTACHMENTS_BUCKET, uploadTaskAttachment } from "@/lib/task-attachments"
import { assertBranchExists, assertSubBranchExists } from "@/lib/utils/sub-branch-branch"

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

  const contentType = request.headers.get("content-type") ?? ""
  let title: string
  let description: string | null
  let branch_id: string | null
  let sub_branch_id: string | null
  let due_date: string | null
  let assigned_hours: number
  let is_admin: boolean
  let priority: "low" | "medium" | "high"
  let attachmentFile: File | null = null

  function parsePriority(value: unknown): "low" | "medium" | "high" {
    if (value === "medium" || value === "high") return value
    return "low"
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    title = String(form.get("title") ?? "").trim()
    const desc = String(form.get("description") ?? "").trim()
    description = desc.length > 0 ? desc : null
    const br = String(form.get("branchId") ?? "").trim()
    const sub = String(form.get("subBranchId") ?? "").trim()
    branch_id = br.length > 0 ? br : null
    sub_branch_id = sub.length > 0 ? sub : null
    const due = String(form.get("dueDate") ?? "").trim()
    due_date = due.length > 0 ? due : null
    assigned_hours = parseAssignedHours(form.get("assignedHours"))
    is_admin = String(form.get("is_admin") ?? "") === "true"
    priority = parsePriority(String(form.get("priority") ?? ""))
    const f = form.get("attachment")
    if (f instanceof File && f.size > 0) {
      attachmentFile = f
    }
  } else {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    title = String(body.title ?? "").trim()
    const descRaw = body.description
    description =
      typeof descRaw === "string" && descRaw.trim() ? descRaw.trim() : null

    const branchRaw = body.branchId ?? body.branch_id
    const subRaw = body.subBranchId ?? body.sub_branch_id
    branch_id =
      typeof branchRaw === "string" && branchRaw.trim() ? branchRaw.trim() : null
    sub_branch_id =
      typeof subRaw === "string" && subRaw.trim() ? subRaw.trim() : null

    const dueRaw = body.dueDate ?? body.due_date
    due_date =
      typeof dueRaw === "string" && dueRaw.trim() ? dueRaw.trim() : null

    assigned_hours = parseAssignedHours(body.assignedHours ?? body.assigned_hours)
    is_admin = body.is_admin === true
    priority = parsePriority(body.priority)
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  if (branch_id) {
    const brCheck = await assertBranchExists(supabase, branch_id)
    if (!brCheck.ok) {
      return NextResponse.json({ error: brCheck.message }, { status: 400 })
    }
  }

  if (sub_branch_id) {
    const check = await assertSubBranchExists(supabase, sub_branch_id)
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 400 })
    }
  }

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
      priority,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[create-tasks]", error)
    return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 })
  }

  const taskId = data.id as string
  let uploadedPath: string | null = null

  if (attachmentFile) {
    const up = await uploadTaskAttachment(supabase, taskId, attachmentFile)
    if ("error" in up) {
      await supabase.from("tasks").delete().eq("id", taskId)
      return NextResponse.json({ error: up.error }, { status: 400 })
    }
    uploadedPath = up.path
    const { error: attErr } = await supabase
      .from("tasks")
      .update({ attachment_path: up.path })
      .eq("id", taskId)
    if (attErr) {
      console.error("[create-tasks] attachment update", attErr)
      await supabase.storage.from(TASK_ATTACHMENTS_BUCKET).remove([up.path])
      await supabase.from("tasks").delete().eq("id", taskId)
      return NextResponse.json(
        { error: attErr.message || "Failed to save attachment" },
        { status: 500 },
      )
    }
  }

  revalidatePath("/tasks")

  return NextResponse.json({ success: true, task: { id: taskId, attachment_path: uploadedPath } })
}
