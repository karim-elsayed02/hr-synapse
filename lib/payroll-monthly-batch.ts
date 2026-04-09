import type { SupabaseClient } from "@supabase/supabase-js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Calendar month/year in Europe/London (org payroll period). */
export function calendarMonthYearLondon(d = new Date()): { month: number; year: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
  });
  const parts = fmt.formatToParts(d);
  const year = parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "0", 10);
  return { month, year };
}

export function monthlyBatchTitle(month: number, year: number, fullName: string): string {
  const m = MONTH_NAMES[month - 1] ?? String(month);
  return `${m} ${year} — ${fullName}`;
}

/**
 * Ensures a payroll_batches row exists for (user, month, year) and returns its id.
 */
export async function ensurePayrollBatchForMonth(
  supabase: SupabaseClient,
  staffUserId: string,
  month: number,
  year: number
): Promise<string | null> {
  const { data: existing, error: selErr } = await supabase
    .from("payroll_batches")
    .select("id")
    .eq("total_payment_user_id", staffUserId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (selErr) {
    console.error("ensurePayrollBatchForMonth select:", selErr);
    return null;
  }
  if (existing?.id) return existing.id as string;

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", staffUserId)
    .single();

  const fullName = prof?.full_name?.trim() || "Staff";
  const title = monthlyBatchTitle(month, year, fullName);

  const { data: created, error: insErr } = await supabase
    .from("payroll_batches")
    .insert({
      title,
      total_payment_user_id: staffUserId,
      month,
      year,
    })
    .select("id")
    .single();

  if (!insErr && created?.id) return created.id as string;

  if (insErr?.code === "23505") {
    const { data: again } = await supabase
      .from("payroll_batches")
      .select("id")
      .eq("total_payment_user_id", staffUserId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();
    return (again?.id as string) ?? null;
  }

  console.error("ensurePayrollBatchForMonth insert:", insErr);
  return null;
}
