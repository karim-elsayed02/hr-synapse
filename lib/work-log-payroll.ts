import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarMonthYearLondon, ensurePayrollBatchForMonth } from "@/lib/payroll-monthly-batch";
import { notifyPayEntryCreated } from "@/lib/notifications";

export type WorkLogPayrollInput = {
  workLogId: string;
  staffProfileId: string;
  workDate: string;
  hoursWorked: number;
  description: string;
};

export type WorkLogPayrollResult =
  | { ok: true; payrollEntryId: string; totalPay: number }
  | { ok: false; error: string; status: number };

/**
 * Creates an unpaid payroll entry from an approved work log (hours × staff hourly_rate).
 */
export async function createPayrollFromWorkLog(
  supabase: SupabaseClient,
  input: WorkLogPayrollInput,
): Promise<WorkLogPayrollResult> {
  const { data: existingPayroll } = await supabase
    .from("payroll_entries")
    .select("id")
    .eq("work_log_id", input.workLogId)
    .maybeSingle();

  if (existingPayroll?.id) {
    return { ok: true, payrollEntryId: existingPayroll.id as string, totalPay: 0 };
  }

  const { data: payProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("hourly_rate, full_name")
    .eq("id", input.staffProfileId)
    .single();

  if (profileErr || !payProfile) {
    return { ok: false, error: "Could not load staff profile for payroll.", status: 400 };
  }

  const hourlyRate = parseFloat(String(payProfile.hourly_rate ?? ""));
  if (Number.isNaN(hourlyRate) || hourlyRate <= 0) {
    return {
      ok: false,
      error:
        "This staff member has no hourly rate on their profile. Set it in Staff Directory before approving.",
      status: 400,
    };
  }

  const hours = Number(input.hoursWorked);
  if (!Number.isFinite(hours) || hours <= 0) {
    return { ok: false, error: "Work log hours must be greater than 0.", status: 400 };
  }

  const totalPay = hours * hourlyRate;

  const { data: inserted, error: insertErr } = await supabase
    .from("payroll_entries")
    .insert({
      work_log_id: input.workLogId,
      profile_id: input.staffProfileId,
      hours,
      hourly_rate: hourlyRate,
      total_pay: totalPay,
      status: "unpaid",
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: again } = await supabase
        .from("payroll_entries")
        .select("id")
        .eq("work_log_id", input.workLogId)
        .maybeSingle();
      if (again?.id) {
        return { ok: true, payrollEntryId: again.id as string, totalPay };
      }
    }
    console.error("createPayrollFromWorkLog insert:", insertErr);
    return { ok: false, error: insertErr.message || "Failed to create payroll entry.", status: 400 };
  }

  const entryId = inserted?.id as string;
  if (entryId) {
    const workDate = new Date(`${input.workDate}T12:00:00`);
    const { month, year } = calendarMonthYearLondon(workDate);
    const batchId = await ensurePayrollBatchForMonth(supabase, input.staffProfileId, month, year);
    if (batchId) {
      const { error: linkErr } = await supabase
        .from("payroll_entries")
        .update({ payroll_batch_id: batchId })
        .eq("id", entryId);
      if (linkErr) {
        console.error("createPayrollFromWorkLog batch link:", linkErr);
      }
    }

    const label = input.description.trim().slice(0, 80) || "Work log";
    notifyPayEntryCreated(supabase, {
      entryId,
      sourceLabel: `work log (${label})`,
      staffName: payProfile.full_name ?? "Unknown",
    }).catch(() => {});
  }

  return { ok: true, payrollEntryId: entryId, totalPay };
}
