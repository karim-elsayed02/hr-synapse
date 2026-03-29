"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type TaskStatus =
  | "open"
  | "claimed"
  | "in_progress"
  | "completed"
  | "approved"
  | "cancelled";

async function requireUser() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Profile not found");
  }

  return { supabase, user, profile };
}

function asNullableString(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue.length > 0 ? stringValue : null;
}

function asNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isAdminOrManager(role: string) {
  return role === "admin" || role === "manager";
}

function buildTaskIdFormData(taskId: string) {
  const fd = new FormData();
  fd.set("taskId", taskId);
  return fd;
}

/* =========================
   GET TASKS
========================= */
export async function getTasksAction() {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      assigned_hours,
      status,
      due_date,
      created_at,
      claimed_at,
      completed_at,
      approved_at,
      claimed_by,
      branch_id,
      sub_branch_id
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, tasks: [] };
  }

  return { success: true, tasks: data ?? [] };
}

/* =========================
   CREATE TASK (FIXED)
========================= */
export async function createTaskAction(input: FormData | Record<string, unknown>) {
  const { supabase, user, profile } = await requireUser();

  if (!isAdminOrManager(profile.role)) {
    throw new Error("Only admins or managers can create tasks");
  }

  const isFormData = input instanceof FormData;

  const title = isFormData
    ? String(input.get("title") ?? "").trim()
    : String(input.title ?? "").trim();

  const description = isFormData
    ? asNullableString(input.get("description"))
    : typeof input.description === "string" && input.description.trim()
      ? input.description.trim()
      : null;

  const branchId = isFormData
    ? asNullableString(input.get("branchId"))
    : typeof input.branchId === "string" && input.branchId.trim()
      ? input.branchId.trim()
      : null;

  const subBranchId = isFormData
    ? asNullableString(input.get("subBranchId"))
    : typeof input.subBranchId === "string" && input.subBranchId.trim()
      ? input.subBranchId.trim()
      : null;

  const dueDate = isFormData
    ? asNullableString(input.get("dueDate"))
    : typeof input.dueDate === "string" && input.dueDate.trim()
      ? input.dueDate.trim()
      : null;

  const assignedHours = isFormData
    ? asNumber(input.get("assignedHours"), 1)
    : typeof input.assignedHours === "number"
      ? input.assignedHours
      : asNumber(String(input.assignedHours ?? 1), 1);

  if (!title) {
    throw new Error("Task title is required");
  }

  /* 🔥 CRITICAL FIX: created_by added */
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      branch_id: branchId,
      sub_branch_id: subBranchId,
      assigned_hours: assignedHours,
      due_date: dueDate,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  return { success: true, taskId: data.id };
}

/* =========================
   UPDATE TASK
========================= */
export async function updateTaskAction(input: FormData | Record<string, unknown>) {
  const { supabase, profile } = await requireUser();

  const isFormData = input instanceof FormData;

  const taskId = isFormData
    ? String(input.get("taskId") ?? "").trim()
    : String(input.taskId ?? "").trim();

  const status = isFormData
    ? String(input.get("status") ?? "").trim()
    : String(input.status ?? "").trim();

  if (!taskId) throw new Error("Missing taskId");
  if (!status) throw new Error("Missing status");

  /* ===== STATUS HANDLING (FIXED) ===== */
  if (status === "claimed") {
    await claimTask(buildTaskIdFormData(taskId));
    return { success: true };
  }

  if (status === "in_progress") {
    await markTaskInProgress(buildTaskIdFormData(taskId));
    return { success: true };
  }

  if (status === "completed") {
    await markTaskCompleted(buildTaskIdFormData(taskId));
    return { success: true };
  }

  if (status === "approved") {
    await approveTask(buildTaskIdFormData(taskId));
    return { success: true };
  }

  /* ===== FIELD UPDATES ===== */
  if (!isAdminOrManager(profile.role)) {
    throw new Error("Only admins or managers can edit task details");
  }

  const updates: Record<string, unknown> = {};

  if (isFormData) {
    const title = asNullableString(input.get("title"));
    const description = asNullableString(input.get("description"));
    const dueDate = asNullableString(input.get("dueDate"));
    const assignedHoursRaw = input.get("assignedHours");

    if (title !== null) updates.title = title;
    if (description !== null) updates.description = description;
    if (dueDate !== null) updates.due_date = dueDate;
    if (assignedHoursRaw !== null && String(assignedHoursRaw).trim() !== "") {
      updates.assigned_hours = asNumber(assignedHoursRaw, 1);
    }
  } else {
    if (typeof input.title === "string") updates.title = input.title.trim();
    if (typeof input.description === "string") updates.description = input.description.trim();
    if (typeof input.dueDate === "string") updates.due_date = input.dueDate.trim();
    if (typeof input.assignedHours === "number") updates.assigned_hours = input.assignedHours;
  }

  const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  return { success: true };
}

/* =========================
   STATUS ACTIONS
========================= */

export async function claimTask(formData: FormData) {
  const { supabase, user } = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  if (!taskId) throw new Error("Missing taskId");

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "claimed",
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("status", "open");

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
}

export async function markTaskInProgress(formData: FormData) {
  const { supabase, user } = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  if (!taskId) throw new Error("Missing taskId");

  const { error } = await supabase
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", taskId)
    .eq("claimed_by", user.id)
    .eq("status", "claimed");

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
}

export async function markTaskCompleted(formData: FormData) {
  const { supabase, user } = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  if (!taskId) throw new Error("Missing taskId");

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("claimed_by", user.id)
    .eq("status", "in_progress");

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
}

export async function approveTask(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  if (!taskId) throw new Error("Missing taskId");

  if (profile.role !== "admin") {
    throw new Error("Only admins can approve tasks");
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("status", "completed");

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  revalidatePath("/payroll");
}
