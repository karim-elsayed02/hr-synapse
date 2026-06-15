import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessStaffWorkLog,
  canApproveWorkLog,
  canViewAllWorkLogs,
} from "@/lib/utils/permissions";
import type { WorkLogRow, WorkLogStaffOption } from "@/lib/types/staff-work-log";
import { WorkLogClient } from "@/components/work-log/work-log-client";

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeBranchSlug(branch: string | null | undefined): string {
  return (branch ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

type WorkLogPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function WorkLogPage({ searchParams }: WorkLogPageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, full_name, branch")
    .eq("id", user.id)
    .single();

  if (!currentProfile || !canAccessStaffWorkLog(currentProfile.role)) {
    return (
      <div className="flex items-center justify-center p-16 text-[#001A3D]/60">
        You don&apos;t have permission to view the work log.
      </div>
    );
  }

  const toDefault = formatLocalYmd(new Date());
  const fromDefaultDate = new Date();
  fromDefaultDate.setDate(fromDefaultDate.getDate() - 90);
  const fromDefault = formatLocalYmd(fromDefaultDate);

  const from = firstParam(searchParams.from) ?? fromDefault;
  const to = firstParam(searchParams.to) ?? toDefault;
  const staffId = firstParam(searchParams.staff) ?? "";

  const seesAll = canViewAllWorkLogs(currentProfile.role);
  const canApprove = canApproveWorkLog(currentProfile.role);

  let logsQuery = supabase
    .from("staff_work_logs")
    .select(
      `
      id,
      staff_profile_id,
      logged_by_id,
      work_date,
      hours_worked,
      description,
      status,
      reviewed_by_id,
      reviewed_at,
      rejection_reason,
      payroll_entry_id,
      created_at,
      staff:profiles!staff_work_logs_staff_profile_id_fkey ( id, full_name, email, branch )
    `,
    )
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (!seesAll) {
    logsQuery = logsQuery.eq("staff_profile_id", user.id);
  } else if (staffId) {
    logsQuery = logsQuery.eq("staff_profile_id", staffId);
  }

  const { data: logsRaw, error: logsError } = await logsQuery;

  let logs = (logsRaw ?? []) as WorkLogRow[];
  let loadError = logsError?.message ?? null;

  if (logsError?.code === "42703") {
    const fallbackQuery = supabase
      .from("staff_work_logs")
      .select(
        `
        id,
        staff_profile_id,
        logged_by_id,
        work_date,
        hours_worked,
        description,
        created_at,
        staff:profiles!staff_work_logs_staff_profile_id_fkey ( id, full_name, email, branch )
      `,
      )
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    const scopedFallback = !seesAll
      ? fallbackQuery.eq("staff_profile_id", user.id)
      : staffId
        ? fallbackQuery.eq("staff_profile_id", staffId)
        : fallbackQuery;

    const { data: fallbackLogs, error: fallbackErr } = await scopedFallback;
    if (!fallbackErr) {
      logs = (fallbackLogs ?? []).map((row) => ({
        ...(row as Omit<WorkLogRow, "status" | "reviewed_by_id" | "reviewed_at" | "rejection_reason" | "payroll_entry_id">),
        status: "approved" as const,
        reviewed_by_id: null,
        reviewed_at: null,
        rejection_reason: null,
        payroll_entry_id: null,
      }));
      loadError =
        "Work log approval columns are missing — run scripts/36_work_log_approval.sql in Supabase.";
    }
  }

  if (seesAll && currentProfile.role === "branch_lead" && currentProfile.branch) {
    const viewerBranch = normalizeBranchSlug(currentProfile.branch);
    logs = logs.filter((row) => {
      const staff = Array.isArray(row.staff) ? row.staff[0] : row.staff;
      return normalizeBranchSlug(staff?.branch) === viewerBranch;
    });
  }

  const { data: staffOptionsRaw, error: staffError } = await supabase
    .from("profiles")
    .select("id, full_name, email, branch")
    .order("full_name", { ascending: true });

  if (staffError) {
    console.error("profiles load for work log failed:", staffError);
  }

  let staffOptions = (staffOptionsRaw ?? []) as WorkLogStaffOption[];

  if (currentProfile.role === "branch_lead" && currentProfile.branch) {
    const viewerBranch = normalizeBranchSlug(currentProfile.branch);
    staffOptions = staffOptions.filter((s) => normalizeBranchSlug(s.branch) === viewerBranch);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <WorkLogClient
        initialLogs={logs}
        staffOptions={staffOptions}
        currentUserId={user.id}
        canApprove={canApprove}
        seesAll={seesAll}
        filterFrom={from}
        filterTo={to}
        filterStaffId={staffId}
        loadError={loadError}
      />
    </div>
  );
}
