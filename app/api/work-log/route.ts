import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canApproveWorkLog } from "@/lib/utils/permissions";
import { createPayrollFromWorkLog } from "@/lib/work-log-payroll";
import {
  notifyWorkLogRequestDecision,
  notifyWorkLogRequestSubmitted,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

async function getAuth() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  return { user, profile, supabase };
}

function parseHours(raw: unknown): number | null {
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return null;
  return hours;
}

/**
 * POST /api/work-log
 * Non-admins create a pending request. Admins/executives create approved entries + payroll.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile, supabase } = await getAuth();
    if (!user || !profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const workDate = String(body.work_date ?? "").trim();
    const description = String(body.description ?? "").trim();
    const hours = parseHours(body.hours_worked);

    if (!workDate) {
      return NextResponse.json({ error: "Work date is required" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (hours == null) {
      return NextResponse.json(
        { error: "Hours must be greater than 0 and at most 24" },
        { status: 400 },
      );
    }

    const isElevated = canApproveWorkLog(profile.role);
    const staffProfileId = user.id;

    const { data: row, error: insertErr } = await supabase
      .from("staff_work_logs")
      .insert({
        staff_profile_id: staffProfileId,
        logged_by_id: user.id,
        work_date: workDate,
        hours_worked: hours,
        description,
        status: isElevated ? "approved" : "pending",
        reviewed_by_id: isElevated ? user.id : null,
        reviewed_at: isElevated ? new Date().toISOString() : null,
      })
      .select("id, staff_profile_id, work_date, hours_worked, description, status")
      .single();

    if (insertErr) {
      console.error("POST /api/work-log insert:", insertErr);
      return NextResponse.json(
        { error: insertErr.message || "Failed to create work log" },
        { status: 400 },
      );
    }

    if (isElevated && row) {
      const payroll = await createPayrollFromWorkLog(supabase, {
        workLogId: row.id,
        staffProfileId: row.staff_profile_id,
        workDate: row.work_date,
        hoursWorked: Number(row.hours_worked),
        description: row.description,
      });

      if (!payroll.ok) {
        await supabase.from("staff_work_logs").delete().eq("id", row.id);
        return NextResponse.json({ error: payroll.error }, { status: payroll.status });
      }

      await supabase
        .from("staff_work_logs")
        .update({ payroll_entry_id: payroll.payrollEntryId })
        .eq("id", row.id);

      return NextResponse.json({
        success: true,
        id: row.id,
        status: "approved",
        payroll_entry_id: payroll.payrollEntryId,
      });
    }

    if (row) {
      notifyWorkLogRequestSubmitted(supabase, {
        workLogId: row.id,
        requesterName: profile.full_name?.trim() || "A staff member",
        workDate: row.work_date,
        hoursWorked: Number(row.hours_worked),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, id: row?.id, status: "pending" });
  } catch (err) {
    console.error("POST /api/work-log unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
