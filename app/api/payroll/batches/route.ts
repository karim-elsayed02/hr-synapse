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
 * GET /api/payroll/batches
 * List all batches with entry counts and totals.
 */
export async function GET() {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: batches, error: batchErr } = await supabase
      .from("payroll_batches")
      .select(`
        id,
        title,
        period_start,
        period_end,
        processed_by,
        processed_at,
        created_at,
        processed_by_profile:profiles!payroll_batches_processed_by_fkey(id, full_name)
      `)
      .order("created_at", { ascending: false });

    if (batchErr) {
      console.error("GET /api/payroll/batches failed:", batchErr);
      return NextResponse.json({ error: "Failed to load batches" }, { status: 500 });
    }

    const { data: entries } = await supabase
      .from("payroll_entries")
      .select("id, payroll_batch_id, total_pay, status");

    const entryList = entries ?? [];
    const enriched = (batches ?? []).map((b: Record<string, unknown>) => {
      const batchEntries = entryList.filter((e: { payroll_batch_id: string | null }) => e.payroll_batch_id === b.id);
      return {
        ...b,
        entry_count: batchEntries.length,
        total_amount: batchEntries.reduce((s: number, e: { total_pay: number }) => s + Number(e.total_pay), 0),
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
 * POST /api/payroll/batches
 * Create a new batch.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const period_start = body.period_start || null;
    const period_end = body.period_end || null;

    if (!title) {
      return NextResponse.json({ error: "Batch title is required" }, { status: 400 });
    }

    const { data, error: insertErr } = await supabase
      .from("payroll_batches")
      .insert({ title, period_start, period_end })
      .select("id")
      .single();

    if (insertErr) {
      console.error("POST /api/payroll/batches insert failed:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("POST /api/payroll/batches unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/payroll/batches
 * Assign entries to a batch, or process a batch (mark all entries paid).
 * Body: { action: "assign", batch_id, entry_ids: string[] }
 *   or  { action: "process", batch_id }
 *   or  { action: "remove", entry_ids: string[] }
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

    if (action === "assign") {
      const batch_id = String(body.batch_id ?? "").trim();
      const entry_ids = body.entry_ids as string[];

      if (!batch_id || !Array.isArray(entry_ids) || entry_ids.length === 0) {
        return NextResponse.json({ error: "batch_id and entry_ids required" }, { status: 400 });
      }

      const { error } = await supabase
        .from("payroll_entries")
        .update({ payroll_batch_id: batch_id })
        .in("id", entry_ids);

      if (error) {
        console.error("Assign entries to batch failed:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "remove") {
      const entry_ids = body.entry_ids as string[];

      if (!Array.isArray(entry_ids) || entry_ids.length === 0) {
        return NextResponse.json({ error: "entry_ids required" }, { status: 400 });
      }

      const { error } = await supabase
        .from("payroll_entries")
        .update({ payroll_batch_id: null })
        .in("id", entry_ids);

      if (error) {
        console.error("Remove entries from batch failed:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "process") {
      const batch_id = String(body.batch_id ?? "").trim();
      if (!batch_id) {
        return NextResponse.json({ error: "batch_id required" }, { status: 400 });
      }

      const now = new Date().toISOString();

      const { data: toProcess, error: listErr } = await supabase
        .from("payroll_entries")
        .select("id, hours, hourly_rate")
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
 * Delete a batch (unlinks entries, does not delete them).
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

    const { error } = await supabase
      .from("payroll_batches")
      .delete()
      .eq("id", batch_id);

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
