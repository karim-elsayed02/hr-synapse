import { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "task_assigned"
  | "task_awaiting_approval"
  | "task_approved"
  | "request_received"
  | "request_approved"
  | "request_rejected"
  | "pay_entry_created"
  | "pay_entry_paid"
  | "document_uploaded"
  | "document_updated"
  | "document_expiring_soon";

interface NotificationPayload {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
}

async function insertNotifications(
  supabase: SupabaseClient,
  rows: NotificationPayload[],
) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("[notifications] insert failed:", error.message);
}

function single(
  supabase: SupabaseClient,
  payload: NotificationPayload,
) {
  return insertNotifications(supabase, [payload]);
}

// ─── Task notifications ───────────────────────────────────────────

export async function notifyTaskAssigned(
  supabase: SupabaseClient,
  opts: { assigneeId: string; taskId: string; taskTitle: string },
) {
  return single(supabase, {
    user_id: opts.assigneeId,
    type: "task_assigned",
    title: "Task assigned to you",
    message: `You have been assigned the task "${opts.taskTitle}".`,
    related_entity_type: "task",
    related_entity_id: opts.taskId,
  });
}

/**
 * Notify admins, branch_leads (matching task branch), and sub_branch_leads
 * (matching task sub_branch) that a task is ready for approval.
 */
export async function notifyTaskAwaitingApproval(
  supabase: SupabaseClient,
  opts: {
    taskId: string;
    taskTitle: string;
    branchId: string | null;
    subBranchId: string | null;
  },
) {
  let branchName: string | null = null;
  let subBranchName: string | null = null;

  if (opts.branchId) {
    const { data } = await supabase
      .from("branches")
      .select("name")
      .eq("id", opts.branchId)
      .single();
    branchName = data?.name?.toLowerCase() ?? null;
  }

  if (opts.subBranchId) {
    const { data } = await supabase
      .from("sub_branches")
      .select("name")
      .eq("id", opts.subBranchId)
      .single();
    subBranchName = data?.name?.toLowerCase() ?? null;
  }

  let query = supabase.from("profiles").select("id, role, branch, department");

  const { data: profiles } = await query;
  if (!profiles || profiles.length === 0) return;

  const recipients = profiles.filter((p) => {
    if (p.role === "admin") return true;
    if (p.role === "branch_lead" && branchName && p.branch?.toLowerCase() === branchName)
      return true;
    if (
      p.role === "sub_branch_lead" &&
      subBranchName &&
      p.department?.toLowerCase() === subBranchName
    )
      return true;
    return false;
  });

  const rows: NotificationPayload[] = recipients.map((r) => ({
    user_id: r.id,
    type: "task_awaiting_approval" as const,
    title: "Task awaiting approval",
    message: `The task "${opts.taskTitle}" has been completed and is waiting for approval.`,
    related_entity_type: "task",
    related_entity_id: opts.taskId,
  }));

  return insertNotifications(supabase, rows);
}

export async function notifyTaskApproved(
  supabase: SupabaseClient,
  opts: { userId: string; taskId: string; taskTitle: string },
) {
  return single(supabase, {
    user_id: opts.userId,
    type: "task_approved",
    title: "Your task has been approved",
    message: `The task "${opts.taskTitle}" has been approved.`,
    related_entity_type: "task",
    related_entity_id: opts.taskId,
  });
}

// ─── Request notifications ────────────────────────────────────────

export async function notifyRequestReceived(
  supabase: SupabaseClient,
  opts: {
    lineManagerId: string;
    requestId: string;
    requestTitle: string;
    requesterName: string;
  },
) {
  return single(supabase, {
    user_id: opts.lineManagerId,
    type: "request_received",
    title: "New request received",
    message: `${opts.requesterName} sent you a request: "${opts.requestTitle}".`,
    related_entity_type: "request",
    related_entity_id: opts.requestId,
  });
}

export async function notifyRequestDecision(
  supabase: SupabaseClient,
  opts: {
    requesterId: string;
    requestId: string;
    requestTitle: string;
    approved: boolean;
  },
) {
  return single(supabase, {
    user_id: opts.requesterId,
    type: opts.approved ? "request_approved" : "request_rejected",
    title: opts.approved ? "Request approved" : "Request rejected",
    message: `Your request "${opts.requestTitle}" has been ${opts.approved ? "approved" : "rejected"}.`,
    related_entity_type: "request",
    related_entity_id: opts.requestId,
  });
}

// ─── Payroll notifications ────────────────────────────────────────

export async function notifyPayEntryCreated(
  supabase: SupabaseClient,
  opts: { entryId: string; taskTitle: string; staffName: string },
) {
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  const rows: NotificationPayload[] = admins.map((a) => ({
    user_id: a.id,
    type: "pay_entry_created" as const,
    title: "New payroll entry",
    message: `A payroll entry was created for ${opts.staffName} (task: "${opts.taskTitle}").`,
    related_entity_type: "payroll_entry",
    related_entity_id: opts.entryId,
  }));

  return insertNotifications(supabase, rows);
}

export async function notifyPayEntryPaid(
  supabase: SupabaseClient,
  opts: { userId: string; entryId: string; amount: number },
) {
  return single(supabase, {
    user_id: opts.userId,
    type: "pay_entry_paid",
    title: "You've been paid",
    message: `A payment of £${opts.amount.toFixed(2)} has been processed for you.`,
    related_entity_type: "payroll_entry",
    related_entity_id: opts.entryId,
  });
}

// ─── Document notifications ───────────────────────────────────────

export async function notifyDocumentUploaded(
  supabase: SupabaseClient,
  opts: { targetUserId: string; documentId: string; documentTitle: string },
) {
  return single(supabase, {
    user_id: opts.targetUserId,
    type: "document_uploaded",
    title: "New document uploaded",
    message: `A document "${opts.documentTitle}" has been uploaded for you.`,
    related_entity_type: "document",
    related_entity_id: opts.documentId,
  });
}

export async function notifyDocumentUpdated(
  supabase: SupabaseClient,
  opts: { targetUserId: string; documentId: string; documentTitle: string },
) {
  return single(supabase, {
    user_id: opts.targetUserId,
    type: "document_updated",
    title: "Document updated",
    message: `The document "${opts.documentTitle}" has been updated.`,
    related_entity_type: "document",
    related_entity_id: opts.documentId,
  });
}
