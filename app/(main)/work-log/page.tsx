import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessStaffWorkLog } from "@/lib/utils/permissions";
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
    .select("id, role, full_name")
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
      created_at,
      staff:profiles!staff_work_logs_staff_profile_id_fkey ( id, full_name, email, branch )
    `
    )
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (staffId) {
    logsQuery = logsQuery.eq("staff_profile_id", staffId);
  }

  const { data: logs, error: logsError } = await logsQuery;

  if (logsError) {
    console.error("staff_work_logs load failed:", logsError);
  }

  const { data: staffOptions, error: staffError } = await supabase
    .from("profiles")
    .select("id, full_name, email, branch")
    .order("full_name", { ascending: true });

  if (staffError) {
    console.error("profiles load for work log failed:", staffError);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <WorkLogClient
        initialLogs={(logs ?? []) as WorkLogRow[]}
        staffOptions={(staffOptions ?? []) as WorkLogStaffOption[]}
        currentUserId={user.id}
        filterFrom={from}
        filterTo={to}
        filterStaffId={staffId}
        loadError={logsError?.message ?? null}
      />
    </div>
  );
}
