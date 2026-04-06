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

const PAYROLL_VIEW_ROLES = new Set(["admin", "branch_lead", "sub_branch_lead", "staff"]);

/**
 * GET /api/payroll
 * Returns payroll entries joined with task + staff profile.
 * Admins see all entries; everyone else only sees their own (profile_id = current user).
 */
export async function GET() {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!role || !PAYROLL_VIEW_ROLES.has(role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let query = supabase
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

    if (role !== "admin") {
      query = query.eq("profile_id", user.id);
    }

    const { data, error: fetchError } = await query;

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
        claimed_by_profile:profiles!tasks_claimed_by_fkey(id, full_name, email, role, branch, hourly_rate)
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
    const hoursFromBody = body.hours !== undefined && body.hours !== "" ? parseFloat(String(body.hours)) : NaN;

    if (!task_id) {
      return NextResponse.json({ error: "Task is required" }, { status: 400 });
    }

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("id, status, claimed_by, assigned_hours")
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

    const { data: payProfile, error: profErr } = await supabase
      .from("profiles")
      .select("hourly_rate")
      .eq("id", task.claimed_by)
      .single();

    if (profErr || !payProfile) {
      return NextResponse.json({ error: "Could not load staff profile for this task" }, { status: 400 });
    }

    const hourly_rate = parseFloat(String(payProfile.hourly_rate ?? ""));
    if (Number.isNaN(hourly_rate) || hourly_rate <= 0) {
      return NextResponse.json(
        {
          error:
            "This staff member has no hourly rate on their profile. Set it in Staff Directory before adding payroll.",
        },
        { status: 400 }
      );
    }

    const baseHours = parseFloat(String(task.assigned_hours ?? "0"));
    const hours =
      !Number.isNaN(hoursFromBody) && hoursFromBody > 0 ? hoursFromBody : baseHours;

    if (hours <= 0) {
      return NextResponse.json({ error: "Hours must be greater than 0 (set task hours or override)" }, { status: 400 });
    }

    const total_pay = hours * hourly_rate;

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

    const { data: existing, error: loadErr } = await supabase
      .from("payroll_entries")
      .select("id, hours, hourly_rate, profile_id")
      .eq("id", id)
      .single();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Payroll entry not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const h = Number(existing.hours);
    const r = Number(existing.hourly_rate);
    const computedTotal = h * r;

    if (newStatus === "paid") {
      updates.status = "paid";
      updates.paid_at = new Date().toISOString();
      updates.total_pay = computedTotal;
    } else if (newStatus === "unpaid") {
      updates.status = "unpaid";
      updates.paid_at = null;
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
