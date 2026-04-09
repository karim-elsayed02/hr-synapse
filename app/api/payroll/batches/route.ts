import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyPayEntryPaid } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const PAYROLL_VIEW_ROLES = new Set(["admin", "branch_lead", "sub_branch_lead", "staff"]);

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
 * GET /api/payroll/batches
 * Monthly batches per staff member: sums unpaid/paid from linked payroll_entries.
 * Admins see everyone; other payroll roles only their own (total_payment_user_id = self).
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
      .from("payroll_batches")
      .select(
        `
        id,
        title,
        month,
        year,
        total_payment_user_id,
        processed_by,
        processed_at,
        created_at,
        staff:profiles!payroll_batches_total_payment_user_id_fkey(id, full_name, email, role, branch),
        processed_by_profile:profiles!payroll_batches_processed_by_fkey(id, full_name)
      `
      )
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (role !== "admin") {
      query = query.eq("total_payment_user_id", user.id);
    }

    const { data: batches, error: batchErr } = await query;

    if (batchErr) {
      console.error("GET /api/payroll/batches failed:", batchErr);
      return NextResponse.json({ error: "Failed to load batches" }, { status: 500 });
    }

    const { data: entries } = await supabase
      .from("payroll_entries")
      .select("id, payroll_batch_id, total_pay, status");

    const entryList = entries ?? [];
    const enriched = (batches ?? []).map((b: Record<string, unknown>) => {
      const batchId = b.id as string;
      const batchEntries = entryList.filter(
        (e: { payroll_batch_id: string | null }) => e.payroll_batch_id === batchId
      );
      return {
        ...b,
        entry_count: batchEntries.length,
        total_amount: batchEntries.reduce(
          (s: number, e: { total_pay: number }) => s + Number(e.total_pay),
          0
        ),
        paid_count: batchEntries.filter((e: { status: string }) => e.status === "paid").length,
        unpaid_count: batchEntries.filter((e: { status: string }) => e.status === "unpaid").length,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET /api/payroll/batches unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/payroll/batches
 * { action: "process", batch_id } — admin only: mark all unpaid entries in batch paid, set processed_at.
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
    const action = String(body.action ?? "").trim();

    if (action === "process") {
      const batch_id = String(body.batch_id ?? "").trim();
      if (!batch_id) {
        return NextResponse.json({ error: "batch_id required" }, { status: 400 });
      }

      const now = new Date().toISOString();

      const { data: toProcess, error: listErr } = await supabase
        .from("payroll_entries")
        .select("id, hours, hourly_rate, profile_id")
        .eq("payroll_batch_id", batch_id)
        .eq("status", "unpaid");

      if (listErr) {
        console.error("Process batch list failed:", listErr);
        return NextResponse.json({ error: listErr.message }, { status: 400 });
      }

      for (const e of toProcess ?? []) {
        const total_pay = Number(e.hours) * Number(e.hourly_rate);
        const { error: upErr } = await supabase
          .from("payroll_entries")
          .update({ status: "paid", paid_at: now, total_pay })
          .eq("id", e.id);

        if (upErr) {
          console.error("Process batch entry failed:", upErr);
          return NextResponse.json({ error: upErr.message }, { status: 400 });
        }

        if (e.profile_id) {
          notifyPayEntryPaid(supabase, {
            userId: e.profile_id,
            entryId: e.id,
            amount: total_pay,
          }).catch(() => {});
        }
      }

      const { error: batchErr } = await supabase
        .from("payroll_batches")
        .update({ processed_by: user.id, processed_at: now })
        .eq("id", batch_id);

      if (batchErr) {
        console.error("Process batch update failed:", batchErr);
        return NextResponse.json({ error: batchErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/payroll/batches unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/payroll/batches
 * Admin only: unlink entries and delete the batch row.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const batch_id = String(body.batch_id ?? "").trim();

    if (!batch_id) {
      return NextResponse.json({ error: "batch_id required" }, { status: 400 });
    }

    await supabase
      .from("payroll_entries")
      .update({ payroll_batch_id: null })
      .eq("payroll_batch_id", batch_id);

    const { error } = await supabase.from("payroll_batches").delete().eq("id", batch_id);

    if (error) {
      console.error("DELETE batch failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/payroll/batches unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
