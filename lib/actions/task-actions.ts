"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeBranchSlug } from "@/lib/utils/org-structure";
import { isManagerLikeRole } from "@/lib/utils/permissions";
import {
  notifyTaskAssigned,
  notifyTaskAwaitingApproval,
  notifyTaskApproved,
} from "@/lib/notifications";

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
    .select("id, full_name, role, branch")
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
  return role === "admin" || isManagerLikeRole(role);
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

  if (profile.role !== "admin" && profile.role !== "branch_lead") {
    throw new Error("Only admins and branch leads can create tasks");
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
  const { supabase, user, profile } = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  if (!taskId) throw new Error("Missing taskId");

  const { data: task, error: fetchErr } = await supabase
    .from("tasks")
    .select("claimed_by, status")
    .eq("id", taskId)
    .single();

  if (fetchErr || !task) throw new Error("Task not found");
  if (task.status !== "claimed") throw new Error("Only claimed tasks can be moved to in progress");

  const isElevated = isAdminOrManager(profile.role);
  if (!isElevated && task.claimed_by !== user.id) {
    throw new Error("Not assigned to this task");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", taskId)
    .eq("status", "claimed");

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
}

/** Admin/manager: assign or reassign a task (not completed / approved). */
export async function assignTaskToUser(formData: FormData) {
  const { supabase, profile } = await requireUser();
  if (!isAdminOrManager(profile.role)) {
    throw new Error("Only admins or managers can assign tasks");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  const assigneeId = String(formData.get("assigneeId") ?? "").trim();
  if (!taskId) throw new Error("Missing taskId");
  if (!assigneeId) throw new Error("Choose a team member");

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) throw new Error("Task not found");
  if (task.status === "completed" || task.status === "approved") {
    throw new Error("Cannot assign completed or approved tasks");
  }

  const { data: assignee, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", assigneeId)
    .maybeSingle();

  if (profileErr || !assignee) throw new Error("User not found");

  const nextStatus = task.status === "in_progress" ? "in_progress" : "claimed";

  const { error } = await supabase
    .from("tasks")
    .update({
      claimed_by: assigneeId,
      claimed_at: new Date().toISOString(),
      status: nextStatus,
    })
    .eq("id", taskId)
    .in("status", ["open", "claimed", "in_progress", "cancelled"]);

  if (error) throw new Error(error.message);

  const { data: taskRow } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", taskId)
    .single();

  await notifyTaskAssigned(supabase, {
    assigneeId,
    taskId,
    taskTitle: taskRow?.title ?? "Untitled task",
  }).catch(() => {});

  revalidatePath("/tasks");
}

/** Admin/manager: clear assignee and return task to open (not completed / approved). */
export async function unassignTask(formData: FormData) {
  const { supabase, profile } = await requireUser();
  if (!isAdminOrManager(profile.role)) {
    throw new Error("Only admins or managers can unassign tasks");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) throw new Error("Missing taskId");

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) throw new Error("Task not found");
  if (task.status === "completed" || task.status === "approved") {
    throw new Error("Cannot unassign completed or approved tasks");
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      claimed_by: null,
      claimed_at: null,
      status: "open",
    })
    .eq("id", taskId)
    .in("status", ["claimed", "in_progress", "cancelled"]);

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
}

/** Admin/manager: move a completed (pre-approval) task back to in progress. */
export async function reopenTaskFromCompleted(formData: FormData) {
  const { supabase, profile } = await requireUser();
  if (!isAdminOrManager(profile.role)) {
    throw new Error("Only admins or managers can reopen tasks");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) throw new Error("Missing taskId");

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "in_progress",
      completed_at: null,
    })
    .eq("id", taskId)
    .eq("status", "completed");

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  revalidatePath("/payroll");
}

export async function markTaskCompleted(formData: FormData) {
  const { supabase, user } = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  if (!taskId) throw new Error("Missing taskId");

  const { data: taskRow } = await supabase
    .from("tasks")
    .select("title, branch_id, sub_branch_id")
    .eq("id", taskId)
    .single();

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

  await notifyTaskAwaitingApproval(supabase, {
    taskId,
    taskTitle: taskRow?.title ?? "Untitled task",
    branchId: taskRow?.branch_id ?? null,
    subBranchId: taskRow?.sub_branch_id ?? null,
  }).catch(() => {});

  revalidatePath("/tasks");
}

export async function approveTask(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  if (!taskId) throw new Error("Missing taskId");

  if (profile.role !== "admin") {
    throw new Error("Only admins can approve tasks");
  }

  const { data: taskRow } = await supabase
    .from("tasks")
    .select("title, claimed_by")
    .eq("id", taskId)
    .single();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("status", "completed");

  if (error) throw new Error(error.message);

  if (taskRow?.claimed_by) {
    await notifyTaskApproved(supabase, {
      userId: taskRow.claimed_by,
      taskId,
      taskTitle: taskRow.title ?? "Untitled task",
    }).catch(() => {});
  }

  revalidatePath("/tasks");
  revalidatePath("/payroll");
}

export type DeleteTaskResult = { error: string | null };

/**
 * Admins: any task. Branch leads: tasks in their branch (or with no branch).
 * Removes linked payroll_entries first so FK constraints do not block task delete.
 */
export async function deleteTask(formData: FormData): Promise<DeleteTaskResult> {
  try {
    const { supabase, profile } = await requireUser();
    const taskId = String(formData.get("taskId") ?? "").trim();
    if (!taskId) return { error: "Missing task id" };

    if (profile.role !== "admin" && profile.role !== "branch_lead") {
      return { error: "Only admins and branch leads can delete tasks" };
    }

    if (profile.role === "branch_lead") {
      const { data: row, error: fetchErr } = await supabase
        .from("tasks")
        .select("branch_id, branch:branches(name)")
        .eq("id", taskId)
        .single();

      if (fetchErr || !row) return { error: "Task not found" };

      const br = row.branch as { name: string } | { name: string }[] | null;
      const branchName = Array.isArray(br) ? br[0]?.name : br?.name;
      const userBranch = profile.branch ?? null;
      const taskSlug = branchName ? normalizeBranchSlug(branchName) : null;
      const userSlug = userBranch ? normalizeBranchSlug(userBranch) : null;
      if (taskSlug && userSlug && taskSlug !== userSlug) {
        return { error: "You can only delete tasks in your branch" };
      }
    }

    const { error: payrollErr } = await supabase
      .from("payroll_entries")
      .delete()
      .eq("task_id", taskId);

    if (payrollErr) {
      return {
        error:
          payrollErr.message ||
          "Could not remove payroll lines for this task. Check database permissions.",
      };
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) return { error: error.message };

    revalidatePath("/tasks");
    revalidatePath("/payroll");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delete failed" };
  }
}
