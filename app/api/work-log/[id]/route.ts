import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canApproveWorkLog } from "@/lib/utils/permissions";
import { createPayrollFromWorkLog } from "@/lib/work-log-payroll";
import { notifyWorkLogRequestDecision } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

/**
 * PATCH /api/work-log/[id]
 * Admin/executive approves or rejects a pending work log request.
 * Approval creates a payroll entry immediately (hours × hourly_rate).
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: reviewer } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!reviewer || !canApproveWorkLog(reviewer.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const workLogId = params.id?.trim();
    if (!workLogId) {
      return NextResponse.json({ error: "Work log id is required" }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    const { data: workLog, error: loadErr } = await supabase
      .from("staff_work_logs")
      .select(
        "id, staff_profile_id, work_date, hours_worked, description, status, payroll_entry_id",
      )
      .eq("id", workLogId)
      .single();

    if (loadErr || !workLog) {
      return NextResponse.json({ error: "Work log not found" }, { status: 404 });
    }

    if (workLog.status !== "pending") {
      return NextResponse.json(
        { error: `This work log is already ${workLog.status}` },
        { status: 409 },
      );
    }

    if (action === "reject") {
      const rejectionReason = String(body.rejection_reason ?? "").trim() || null;
      const { error: rejectErr } = await supabase
        .from("staff_work_logs")
        .update({
          status: "rejected",
          reviewed_by_id: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", workLogId);

      if (rejectErr) {
        console.error("PATCH /api/work-log reject:", rejectErr);
        return NextResponse.json({ error: rejectErr.message }, { status: 400 });
      }

      notifyWorkLogRequestDecision(supabase, {
        requesterId: workLog.staff_profile_id,
        workLogId,
        workDate: workLog.work_date,
        approved: false,
        rejectionReason,
      }).catch(() => {});

      return NextResponse.json({ success: true, status: "rejected" });
    }

    const payroll = await createPayrollFromWorkLog(supabase, {
      workLogId: workLog.id,
      staffProfileId: workLog.staff_profile_id,
      workDate: workLog.work_date,
      hoursWorked: Number(workLog.hours_worked),
      description: workLog.description,
    });

    if (!payroll.ok) {
      return NextResponse.json({ error: payroll.error }, { status: payroll.status });
    }

    const { error: approveErr } = await supabase
      .from("staff_work_logs")
      .update({
        status: "approved",
        reviewed_by_id: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
        payroll_entry_id: payroll.payrollEntryId,
      })
      .eq("id", workLogId);

    if (approveErr) {
      console.error("PATCH /api/work-log approve:", approveErr);
      return NextResponse.json({ error: approveErr.message }, { status: 400 });
    }

    notifyWorkLogRequestDecision(supabase, {
      requesterId: workLog.staff_profile_id,
      workLogId,
      workDate: workLog.work_date,
      approved: true,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      status: "approved",
      payroll_entry_id: payroll.payrollEntryId,
      total_pay: payroll.totalPay,
    });
  } catch (err) {
    console.error("PATCH /api/work-log/[id] unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
