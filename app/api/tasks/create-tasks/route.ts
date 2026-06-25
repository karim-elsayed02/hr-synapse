import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { TASK_ATTACHMENTS_BUCKET, uploadTaskAttachment } from "@/lib/task-attachments"
import { assertBranchExists, assertSubBranchExists } from "@/lib/utils/sub-branch-branch"
import { normalizeBranchSlug, normalizeSubBranchSlug } from "@/lib/utils/org-structure"
import { canAssignToProfile } from "@/lib/utils/task-assignees"
import { notifyTaskAssigned } from "@/lib/notifications"

export const dynamic = "force-dynamic"

function parseAssignedHours(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function parseFixedPayment(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null
  const n = typeof value === "number" ? value : Number(String(value).trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function parsePaymentMode(value: unknown): "hours" | "fixed" {
  return value === "fixed" ? "fixed" : "hours"
}

type BranchScopeInput = { branchId: string; subBranchId: string | null }

function parseBranchScopes(raw: unknown): BranchScopeInput[] {
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseBranchScopes(JSON.parse(raw))
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []

  const scopes: BranchScopeInput[] = []
  const seenBranches = new Set<string>()

  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const branchId = String((item as { branchId?: unknown }).branchId ?? "").trim()
    if (!branchId || seenBranches.has(branchId)) continue
    seenBranches.add(branchId)
    const subRaw = (item as { subBranchId?: unknown }).subBranchId
    const subBranchId =
      typeof subRaw === "string" && subRaw.trim() ? subRaw.trim() : null
    scopes.push({ branchId, subBranchId })
  }
  return scopes
}

function parseLegacyBranchIdList(
  raw: unknown,
  subBranchId: string | null,
): BranchScopeInput[] {
  if (!Array.isArray(raw)) return []
  const ids = [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))]
  return ids.map((branchId, i) => ({
    branchId,
    subBranchId: i === 0 ? subBranchId : null,
  }))
}

function parseBranchScopesFromForm(form: FormData): BranchScopeInput[] {
  const jsonRaw = String(form.get("branchScopes") ?? "").trim()
  if (jsonRaw) {
    const parsed = parseBranchScopes(jsonRaw)
    if (parsed.length > 0) return parsed
  }

  const legacyIds = form
    .getAll("branchIds")
    .map((v) => String(v).trim())
    .filter(Boolean)
  const single = String(form.get("branchId") ?? "").trim()
  const ids = legacyIds.length > 0 ? legacyIds : single ? [single] : []
  const sub = String(form.get("subBranchId") ?? "").trim()
  return ids.map((branchId, i) => ({
    branchId,
    subBranchId: i === 0 && sub ? sub : null,
  }))
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
    .select("role, branch, department")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 })
  }

  if (profile.role !== "admin" && profile.role !== "executive" && profile.role !== "branch_lead") {
    return NextResponse.json({ error: "Only admins, executives, and branch leads can create tasks" }, { status: 403 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  let title: string
  let description: string | null
  let branchScopes: BranchScopeInput[] = []
  let branch_id: string | null
  let sub_branch_id: string | null
  let due_date: string | null
  let assigned_hours: number
  let payment_mode: "hours" | "fixed"
  let fixed_payment_amount: number | null
  let is_admin: boolean
  let priority: "low" | "medium" | "high"
  let assigneeId: string | null = null
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
    branchScopes = parseBranchScopesFromForm(form)
    branch_id = branchScopes[0]?.branchId ?? null
    sub_branch_id = branchScopes[0]?.subBranchId ?? null
    const due = String(form.get("dueDate") ?? "").trim()
    due_date = due.length > 0 ? due : null
    assigned_hours = parseAssignedHours(form.get("assignedHours"))
    payment_mode = parsePaymentMode(String(form.get("paymentMode") ?? ""))
    fixed_payment_amount = parseFixedPayment(form.get("fixedPaymentAmount"))
    is_admin = String(form.get("is_admin") ?? "") === "true"
    priority = parsePriority(String(form.get("priority") ?? ""))
    const assigneeRaw = String(form.get("assigneeId") ?? "").trim()
    assigneeId = assigneeRaw.length > 0 ? assigneeRaw : null
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

    branchScopes = parseBranchScopes(body.branchScopes ?? body.branch_scopes)
    if (branchScopes.length === 0) {
      const subLegacy =
        typeof body.subBranchId === "string" && body.subBranchId.trim()
          ? body.subBranchId.trim()
          : typeof body.sub_branch_id === "string" && body.sub_branch_id.trim()
            ? body.sub_branch_id.trim()
            : null
      branchScopes = parseLegacyBranchIdList(body.branchIds ?? body.branch_ids, subLegacy)
      if (branchScopes.length === 0 && typeof body.branchId === "string" && body.branchId.trim()) {
        branchScopes = [{ branchId: body.branchId.trim(), subBranchId: subLegacy }]
      }
    }
    branch_id = branchScopes[0]?.branchId ?? null
    sub_branch_id = branchScopes[0]?.subBranchId ?? null

    const dueRaw = body.dueDate ?? body.due_date
    due_date =
      typeof dueRaw === "string" && dueRaw.trim() ? dueRaw.trim() : null

    assigned_hours = parseAssignedHours(body.assignedHours ?? body.assigned_hours)
    payment_mode = parsePaymentMode(body.paymentMode ?? body.payment_mode)
    fixed_payment_amount = parseFixedPayment(body.fixedPaymentAmount ?? body.fixed_payment_amount)
    is_admin = body.is_admin === true
    priority = parsePriority(body.priority)
    const assigneeRaw = body.assigneeId ?? body.assignee_id
    assigneeId =
      typeof assigneeRaw === "string" && assigneeRaw.trim() ? assigneeRaw.trim() : null
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  for (const scope of branchScopes) {
    const brCheck = await assertBranchExists(supabase, scope.branchId)
    if (!brCheck.ok) {
      return NextResponse.json({ error: brCheck.message }, { status: 400 })
    }
    if (scope.subBranchId) {
      const subCheck = await assertSubBranchExists(supabase, scope.subBranchId)
      if (!subCheck.ok) {
        return NextResponse.json({ error: subCheck.message }, { status: 400 })
      }
    }
  }

  if (payment_mode === "fixed") {
    if (fixed_payment_amount === null) {
      return NextResponse.json({ error: "Enter a fixed payment amount in GBP" }, { status: 400 })
    }
    assigned_hours = 0
  } else {
    fixed_payment_amount = null
  }

  // Branch leads may only create tasks in their own branch
  if (profile.role === "branch_lead" && branchScopes.length > 0) {
    const creatorBranchSlug = normalizeBranchSlug(profile.branch ?? "")
    for (const scope of branchScopes) {
      const { data: branchRow } = await supabase
        .from("branches")
        .select("name")
        .eq("id", scope.branchId)
        .maybeSingle()
      const taskBranchSlug = normalizeBranchSlug(branchRow?.name ?? "")
      if (taskBranchSlug && creatorBranchSlug && taskBranchSlug !== creatorBranchSlug) {
        return NextResponse.json({ error: "You can only create tasks in your branch" }, { status: 403 })
      }
    }
  }

  const assigneeBranchScopes: { branchSlug: string; subBranchSlug?: string | null }[] = []
  if (branchScopes.length > 0) {
    const branchIds = branchScopes.map((s) => s.branchId)
    const { data: branchRows } = await supabase
      .from("branches")
      .select("id, name")
      .in("id", branchIds)

    const subIds = branchScopes.map((s) => s.subBranchId).filter(Boolean) as string[]
    const subNameById = new Map<string, string>()
    if (subIds.length > 0) {
      const { data: subRows } = await supabase
        .from("sub_branches")
        .select("id, name")
        .in("id", subIds)
      for (const row of subRows ?? []) {
        subNameById.set(row.id as string, row.name as string)
      }
    }

    for (const scope of branchScopes) {
      const branchRow = branchRows?.find((r) => r.id === scope.branchId)
      const branchSlug = normalizeBranchSlug(branchRow?.name ?? "")
      if (!branchSlug) continue
      const subBranchSlug = scope.subBranchId
        ? normalizeSubBranchSlug(subNameById.get(scope.subBranchId) ?? "")
        : null
      assigneeBranchScopes.push({ branchSlug, subBranchSlug })
    }
  }

  if (assigneeId) {
    const { data: assignee, error: assigneeErr } = await supabase
      .from("profiles")
      .select("id, full_name, role, branch, department, active")
      .eq("id", assigneeId)
      .maybeSingle()

    if (assigneeErr || !assignee) {
      return NextResponse.json({ error: "Selected assignee not found" }, { status: 400 })
    }

    if (
      !canAssignToProfile(
        { role: profile.role, branch: profile.branch, department: profile.department },
        assignee,
        {
          branchScopes: assigneeBranchScopes.length > 0 ? assigneeBranchScopes : undefined,
        },
      )
    ) {
      return NextResponse.json(
        { error: "You cannot assign this task to that person based on your access level" },
        { status: 403 }
      )
    }
  }

  const insertPayload: Record<string, unknown> = {
    title,
    description,
    branch_id,
    sub_branch_id,
    assigned_hours,
    payment_mode,
    fixed_payment_amount,
    due_date,
    is_admin,
    priority,
    status: assigneeId ? "claimed" : "open",
    created_by: user.id,
  }

  if (assigneeId) {
    insertPayload.claimed_by = assigneeId
    insertPayload.claimed_at = new Date().toISOString()
  }

  let { data, error } = await supabase
    .from("tasks")
    .insert(insertPayload)
    .select("id")
    .single()

  if (error?.code === "42703" && (payment_mode === "fixed" || fixed_payment_amount != null)) {
    return NextResponse.json(
      {
        error:
          "Fixed payment requires a database update. Run scripts/35_tasks_payment_mode.sql in Supabase SQL Editor.",
      },
      { status: 500 }
    )
  }

  if (error?.code === "42703") {
    const legacyPayload = { ...insertPayload }
    delete legacyPayload.payment_mode
    delete legacyPayload.fixed_payment_amount
    const retry = await supabase.from("tasks").insert(legacyPayload).select("id").single()
    data = retry.data
    error = retry.error
  }

  if (error || !data?.id) {
    console.error("[create-tasks]", error)
    return NextResponse.json({ error: error?.message || "Failed to create task" }, { status: 500 })
  }

  const taskId = data.id as string

  if (branchScopes.length > 0) {
    const linkRows = branchScopes.map((scope) => ({
      task_id: taskId,
      branch_id: scope.branchId,
      sub_branch_id: scope.subBranchId,
    }))
    let { error: linkErr } = await supabase.from("task_branches").insert(linkRows)
    if (linkErr?.code === "42703") {
      const legacyRows = branchScopes.map((scope) => ({
        task_id: taskId,
        branch_id: scope.branchId,
      }))
      const retry = await supabase.from("task_branches").insert(legacyRows)
      linkErr = retry.error
    }
    if (linkErr && linkErr.code !== "42P01") {
      console.error("[create-tasks] task_branches insert", linkErr)
      await supabase.from("tasks").delete().eq("id", taskId)
      return NextResponse.json(
        {
          error:
            linkErr.message ||
            "Failed to link branches. Run scripts/37_task_branches.sql in Supabase.",
        },
        { status: 500 },
      )
    }
  }

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

  if (assigneeId) {
    await notifyTaskAssigned(supabase, {
      assigneeId,
      taskId,
      taskTitle: title,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, task: { id: taskId, attachment_path: uploadedPath } })
}
