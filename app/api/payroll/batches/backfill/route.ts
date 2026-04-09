import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calendarMonthYearLondon, ensurePayrollBatchForMonth } from "@/lib/payroll-monthly-batch";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data: orphans, error: listErr } = await supabase
    .from("payroll_entries")
    .select("id, profile_id, created_at")
    .is("payroll_batch_id", null);

  if (listErr) {
    console.error("backfill list:", listErr);
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  let linked = 0;
  const failures: string[] = [];

  for (const row of orphans ?? []) {
    const createdAt = row.created_at ? new Date(row.created_at as string) : new Date();
    const { month, year } = calendarMonthYearLondon(createdAt);
    const batchId = await ensurePayrollBatchForMonth(
      supabase,
      row.profile_id as string,
      month,
      year
    );

    if (!batchId) {
      failures.push(row.id as string);
      continue;
    }

    const { error: upErr } = await supabase
      .from("payroll_entries")
      .update({ payroll_batch_id: batchId })
      .eq("id", row.id);

    if (upErr) {
      console.error("backfill update:", upErr);
      failures.push(row.id as string);
      continue;
    }
    linked += 1;
  }

  return NextResponse.json({
    success: true,
    linked,
    skipped: failures.length,
    failed_entry_ids: failures.length ? failures : undefined,
  });
}
