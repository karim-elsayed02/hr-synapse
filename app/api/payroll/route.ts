import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, role: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role ?? null, supabase };
}

/**
 * GET /api/payroll
 * Returns payroll entries joined with task + staff profile.
 */
export async function GET() {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (role !== "admin" && role !== "branch_lead" && role !== "sub_branch_lead") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data, error: fetchError } = await supabase
      .from("payroll_entries")
      .select(`
        id,
        task_id,
        profile_id,
        hours,
        hourly_rate,
        total_pay,
        status,
        paid_at,
        payroll_batch_id,
        created_at,
        task:tasks!payroll_entries_task_id_fkey(id, title, assigned_hours, status, approved_at),
        profile:profiles!payroll_entries_profile_id_fkey(id, full_name, email, role, branch)
      `)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("GET /api/payroll failed:", fetchError);
      return NextResponse.json({ error: "Failed to load payroll data" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /api/payroll unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/payroll/approved-tasks
 * Returns approved tasks that do NOT yet have a payroll entry.
 */
export async function PUT() {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: allApproved, error: taskErr } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        assigned_hours,
        approved_at,
        claimed_by,
        claimed_by_profile:profiles!tasks_claimed_by_fkey(id, full_name, email, role, branch)
      `)
      .eq("status", "approved")
      .order("approved_at", { ascending: false });

    if (taskErr) {
      console.error("Fetch approved tasks failed:", taskErr);
      return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
    }

    const { data: existingEntries } = await supabase
      .from("payroll_entries")
      .select("task_id");

    const usedTaskIds = new Set((existingEntries ?? []).map((e: { task_id: string }) => e.task_id));

    const available = (allApproved ?? []).filter(
      (t: { id: string }) => !usedTaskIds.has(t.id)
    );

    return NextResponse.json(available);
  } catch (err) {
    console.error("PUT /api/payroll unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/payroll
 * Create a payroll entry for an approved task.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Only admins can add payroll entries" }, { status: 403 });
    }

    const body = await request.json();

    const task_id = String(body.task_id ?? "").trim();
    const hours = parseFloat(body.hours ?? "0");
    const hourly_rate = parseFloat(body.hourly_rate ?? "0");
    const total_pay = hours * hourly_rate;

    if (!task_id) {
      return NextResponse.json({ error: "Task is required" }, { status: 400 });
    }
    if (hours <= 0) {
      return NextResponse.json({ error: "Hours must be greater than 0" }, { status: 400 });
    }
    if (hourly_rate <= 0) {
      return NextResponse.json({ error: "Hourly rate must be greater than 0" }, { status: 400 });
    }

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("id, status, claimed_by")
      .eq("id", task_id)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.status !== "approved") {
      return NextResponse.json({ error: "Task must be approved before adding to payroll" }, { status: 400 });
    }
    if (!task.claimed_by) {
      return NextResponse.json({ error: "Task has no assigned staff member" }, { status: 400 });
    }

    const { data, error: insertError } = await supabase
      .from("payroll_entries")
      .insert({
        task_id,
        profile_id: task.claimed_by,
        hours,
        hourly_rate,
        total_pay,
        status: "unpaid",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "A payroll entry already exists for this task" }, { status: 409 });
      }
      console.error("POST /api/payroll insert failed:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to create payroll entry" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("POST /api/payroll unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/payroll
 * Mark entry as paid.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body.id ?? "").trim();
    const newStatus = String(body.status ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (newStatus === "paid") {
      const amountPaid = parseFloat(body.amount_paid ?? "0");
      const hours = parseFloat(body.hours ?? "0");
      const rate = parseFloat(body.hourly_rate ?? "0");
      if (amountPaid > 0) updates.total_pay = amountPaid;
      if (hours > 0) updates.hours = hours;
      if (rate > 0) updates.hourly_rate = rate;
      updates.status = "paid";
      updates.paid_at = new Date().toISOString();
    } else if (newStatus === "unpaid") {
      updates.status = "unpaid";
      updates.paid_at = null;
      updates.total_pay = 0;
    } else {
      return NextResponse.json({ error: "Invalid status. Use 'paid' or 'unpaid'" }, { status: 400 });
    }

    const { error } = await supabase
      .from("payroll_entries")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("PATCH /api/payroll failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/payroll unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
