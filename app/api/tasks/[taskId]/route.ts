import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  removeTaskAttachmentStorage,
  uploadTaskAttachment,
} from "@/lib/task-attachments";
import { userCanManageTaskAsCreator } from "@/lib/utils/task-access";

export const dynamic = "force-dynamic";

function parseAssignedHours(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function PATCH(request: NextRequest, context: { params: { taskId: string } }) {
  const taskId = context.params.taskId;
  if (!taskId?.trim()) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* ignore */
          }
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, branch")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  if (profile.role !== "admin" && profile.role !== "branch_lead") {
    return NextResponse.json({ error: "Only admins and branch leads can edit tasks" }, { status: 403 });
  }

  const { data: taskRow, error: taskErr } = await supabase
    .from("tasks")
    .select("id, status, attachment_path, branch:branches(name)")
    .eq("id", taskId)
    .single();

  if (taskErr || !taskRow) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const br = taskRow.branch as { name: string } | { name: string }[] | null;
  const branchName = Array.isArray(br) ? br[0]?.name ?? null : br?.name ?? null;

  if (!userCanManageTaskAsCreator(profile, branchName)) {
    return NextResponse.json({ error: "You cannot edit this task" }, { status: 403 });
  }

  if (taskRow.status === "approved") {
    return NextResponse.json({ error: "Approved tasks cannot be edited" }, { status: 400 });
  }

  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await request.formData();

  const titleRaw = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const dueDateRaw = String(form.get("dueDate") ?? "").trim();
  const due_date = dueDateRaw.length > 0 ? dueDateRaw : null;
  const assignedHours = parseAssignedHours(form.get("assignedHours"));

  const priorityRaw = String(form.get("priority") ?? "").trim();
  const priority =
    priorityRaw === "medium" || priorityRaw === "high" ? priorityRaw : priorityRaw === "low" ? "low" : undefined;

  const removeAttachment = String(form.get("removeAttachment") ?? "") === "1";
  const file = form.get("attachment");

  if (!titleRaw) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    title: titleRaw,
    description,
    due_date,
  };
  if (assignedHours !== undefined) {
    updates.assigned_hours = assignedHours;
  }
  if (priority !== undefined) {
    updates.priority = priority;
  }

  const previousPath = (taskRow.attachment_path as string | null) ?? null;
  let uploadedPath: string | null = null;

  if (removeAttachment && !(file instanceof File && file.size > 0)) {
    await removeTaskAttachmentStorage(supabase, previousPath);
    updates.attachment_path = null;
  }

  if (file instanceof File && file.size > 0) {
    await removeTaskAttachmentStorage(supabase, previousPath);
    const up = await uploadTaskAttachment(supabase, taskId, file);
    if ("error" in up) {
      return NextResponse.json({ error: up.error }, { status: 400 });
    }
    uploadedPath = up.path;
    updates.attachment_path = up.path;
  }

  const { error: updateErr } = await supabase.from("tasks").update(updates).eq("id", taskId);

  if (updateErr) {
    console.error("[PATCH task]", updateErr);
    if (uploadedPath) {
      await removeTaskAttachmentStorage(supabase, uploadedPath);
    }
    return NextResponse.json({ error: updateErr.message || "Update failed" }, { status: 500 });
  }

  revalidatePath("/tasks");
  return NextResponse.json({ success: true });
}
