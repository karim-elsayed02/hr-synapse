import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ApprovedTaskRow = {
  id: string;
  title: string;
  assigned_hours: number;
  approved_at: string | null;
  claimed_by_profile:
    | { id: string; full_name: string | null }
    | { id: string; full_name: string | null }[]
    | null;
};

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function PayrollPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div className="p-6">Failed to load your profile.</div>;
  }

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      assigned_hours,
      approved_at,
      claimed_by_profile:profiles!tasks_claimed_by_fkey(id, full_name)
    `)
    .eq("status", "approved")
    .order("approved_at", { ascending: false });

  if (error) {
    console.error("Payroll query error:", error);
    return <div className="p-6">Failed to load payroll data.</div>;
  }

  const approvedTasks = ((data ?? []) as unknown) as ApprovedTaskRow[];

  const totals = approvedTasks.reduce<Record<string, { name: string; hours: number; count: number }>>(
    (acc, task) => {
      const person = getSingleRelation(task.claimed_by_profile);
      const key = person?.id ?? "unassigned";
      const name = person?.full_name ?? "Unassigned";

      if (!acc[key]) {
        acc[key] = { name, hours: 0, count: 0 };
      }

      acc[key].hours += Number(task.assigned_hours ?? 0);
      acc[key].count += 1;

      return acc;
    },
    {}
  );

  const staffSummaries = Object.entries(totals)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <p className="text-sm text-muted-foreground">
          MVP payroll view based on approved task hours.
        </p>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-4 text-lg font-medium">Approved hours by staff member</h2>

        {staffSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved task hours yet.</p>
        ) : (
          <div className="space-y-3">
            {staffSummaries.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{staff.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {staff.count} approved task{staff.count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{staff.hours} hours</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="mb-4 text-lg font-medium">Approved task log</h2>

        {approvedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved tasks found.</p>
        ) : (
          <div className="space-y-3">
            {approvedTasks.map((task) => {
              const person = getSingleRelation(task.claimed_by_profile);

              return (
                <div key={task.id} className="rounded-lg border px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {person?.full_name ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{task.assigned_hours} hours</p>
                      <p className="text-muted-foreground">
                        {task.approved_at
                          ? new Date(task.approved_at).toLocaleString()
                          : "Approved"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
