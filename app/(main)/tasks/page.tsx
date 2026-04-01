import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  approveTask,
  assignTaskToUser,
  claimTask,
  markTaskCompleted,
  markTaskInProgress,
  reopenTaskFromCompleted,
  unassignTask,
} from "@/lib/actions/task-actions";
import { CreateTaskSheet } from "@/components/tasks/create-task-sheet";
import { RecentTaskLogs } from "@/components/tasks/recent-task-logs";
import { CalendarDays, SlidersHorizontal } from "lucide-react";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  assigned_hours: number;
  status: "open" | "claimed" | "in_progress" | "completed" | "approved" | "cancelled";
  due_date: string | null;
  created_at: string;
  claimed_by: string | null;
  branch_id: string | null;
  sub_branch_id: string | null;
  branch: { id: string; name: string } | { id: string; name: string }[] | null;
  sub_branch: { id: string; name: string } | { id: string; name: string }[] | null;
  claimed_by_profile:
    | { id: string; full_name: string | null }
    | { id: string; full_name: string | null }[]
    | null;
};

type BranchRow = { id: string; name: string };
type SubBranchRow = { id: string; name: string; branch_id: string | null };

function rel<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function statusProgress(s: string): number {
  const map: Record<string, number> = {
    open: 0, claimed: 25, in_progress: 50, completed: 90, approved: 100,
  };
  return map[s] ?? 0;
}

const TAG_COLORS = [
  { bg: "bg-red-50 text-red-700", dot: "bg-red-500" },
  { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { bg: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
];

function tagColor(name: string | null) {
  if (!name) return TAG_COLORS[0];
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return TAG_COLORS[h % TAG_COLORS.length];
}

function formatShortDate(iso: string | null) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}

export default async function TasksPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[#001A3D]/50">Failed to load your profile.</p>
      </div>
    );
  }

  const [{ data: taskData, error: taskError }, { data: branchData }, { data: subBranchData }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(`
          id, title, description, assigned_hours, status, due_date,
          created_at, claimed_by, branch_id, sub_branch_id,
          branch:branches(id, name),
          sub_branch:sub_branches(id, name),
          claimed_by_profile:profiles!tasks_claimed_by_fkey(id, full_name)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("sub_branches").select("id, name, branch_id").order("name"),
    ]);

  if (taskError) {
    console.error("Tasks query error:", taskError);
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[#001A3D]/50">Failed to load tasks.</p>
      </div>
    );
  }

  const tasks = (taskData ?? []) as unknown as TaskRow[];
  const branches = (branchData ?? []) as unknown as BranchRow[];
  const subBranches = (subBranchData ?? []) as unknown as SubBranchRow[];

  const canCreate = profile.role === "admin" || profile.role === "manager";
  const isAdmin = profile.role === "admin";

  let staffForAssign: { id: string; full_name: string | null }[] = [];
  if (canCreate) {
    const { data: staffRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    staffForAssign = (staffRows ?? []) as { id: string; full_name: string | null }[];
  }

  const openTasks = tasks.filter((t) => t.status === "open");
  const progressTasks = tasks.filter((t) => t.status === "claimed" || t.status === "in_progress");
  /** Completed column: awaiting approval only — approved tasks appear in Recent Task Logs only. */
  const doneTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#001A3D] sm:text-3xl">
            Task Management
          </h1>
          <p className="mt-2 text-sm text-[#001A3D]/55">
            Oversee and organise clinical and administrative workflows.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-full bg-[#f3f4f5] px-4 py-2.5 text-sm font-medium text-[#001A3D] transition-colors hover:bg-[#ebeced]">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
          <CreateTaskSheet canCreate={canCreate} branches={branches} subBranches={subBranches} />
        </div>
      </div>

      {/* ─── Kanban board ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <KanbanColumn
          title="Open"
          count={openTasks.length}
          accentColor="bg-[#FFB84D]"
          emptyLabel="No open tasks"
        >
          {openTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userId={user.id}
              isAdmin={isAdmin}
              isManager={canCreate}
              staff={staffForAssign}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="In Progress"
          count={progressTasks.length}
          accentColor="bg-sky-400"
          emptyLabel="No tasks in progress"
        >
          {progressTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userId={user.id}
              isAdmin={isAdmin}
              isManager={canCreate}
              staff={staffForAssign}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn
          title="Completed"
          count={doneTasks.length}
          accentColor="bg-emerald-400"
          emptyLabel="No completed tasks"
        >
          {doneTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userId={user.id}
              isAdmin={isAdmin}
              isManager={canCreate}
              staff={staffForAssign}
            />
          ))}
        </KanbanColumn>
      </div>

      {/* Full history including approved — search filters by title, ID, or assignee */}
      <RecentTaskLogs tasks={tasks} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Sub-components (server, co-located)
   ═══════════════════════════════════════════════ */

function KanbanColumn({
  title,
  count,
  accentColor,
  emptyLabel,
  children,
}: {
  title: string;
  count: number;
  accentColor: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-4 flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full ${accentColor}`} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#001A3D]/50">
          {title}
        </h3>
        <span className="text-[11px] font-medium text-[#001A3D]/30">
          {String(count).padStart(2, "0")}
        </span>
        <span className={`ml-auto h-[3px] flex-1 rounded-full ${accentColor}/20`} />
      </div>
      <div className="space-y-4">
        {count === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-2xl bg-[#f3f4f5] text-sm text-[#001A3D]/35">
            {emptyLabel}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  userId,
  isAdmin,
  isManager,
  staff,
}: {
  task: TaskRow;
  userId: string;
  isAdmin: boolean;
  isManager: boolean;
  staff: { id: string; full_name: string | null }[];
}) {
  const branch = rel(task.branch);
  const claimer = rel(task.claimed_by_profile);
  const progress = statusProgress(task.status);
  const tag = tagColor(branch?.name ?? null);

  const isTerminal = task.status === "approved";
  const isLocked = task.status === "completed" || task.status === "approved";

  const canClaim = task.status === "open";
  const canStart =
    task.status === "claimed" && (task.claimed_by === userId || isManager);
  const canComplete = task.status === "in_progress" && task.claimed_by === userId;
  const canApprove = isAdmin && task.status === "completed";
  const canAssign = isManager && !isLocked;
  const canUnassign =
    isManager &&
    !isLocked &&
    (task.status === "claimed" || task.status === "in_progress" || task.status === "cancelled");
  const canReopenCompleted = isManager && task.status === "completed";

  const hasAction =
    canClaim ||
    canStart ||
    canComplete ||
    canApprove ||
    canAssign ||
    canUnassign ||
    canReopenCompleted;

  return (
    <div className="curator-card group relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5">
      {/* Category tag */}
      {branch && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${tag.bg}`}
        >
          {branch.name}
        </span>
      )}

      {/* Title + description */}
      <h3 className="mt-3 font-medium leading-snug text-[#001A3D]">{task.title}</h3>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#001A3D]/55">
          {task.description}
        </p>
      )}

      {/* Progress */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#001A3D]/55">
        <span>Progress</span>
        <span className="font-semibold text-[#001A3D]/70">{progress}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#001A3D]/8">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #4DB8FF 0%, #3AAFA9 100%)",
          }}
        />
      </div>

      {/* Footer: avatar + due date */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-[10px] font-semibold text-[#FFB84D]">
            {claimer?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
          <span className="text-xs text-[#001A3D]/55">
            {claimer?.full_name ?? "Unclaimed"}
          </span>
        </div>
        {task.due_date && (
          <span className="inline-flex items-center gap-1 text-xs text-[#001A3D]/45">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatShortDate(task.due_date)}
          </span>
        )}
      </div>

      {/* Hours badge */}
      <div className="mt-3 inline-flex items-center gap-1 rounded-md bg-[#001A3D]/5 px-2 py-1 text-[10px] font-medium text-[#001A3D]/60">
        {task.assigned_hours}h allocated
      </div>

      {/* Action buttons */}
      {hasAction && (
        <div className="mt-4 space-y-3">
          {canAssign && staff.length > 0 && (
            <form action={assignTaskToUser} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input type="hidden" name="taskId" value={task.id} />
              <select
                name="assigneeId"
                required
                defaultValue={task.claimed_by ?? ""}
                className="min-w-0 flex-1 rounded-xl border-0 bg-[#f3f4f5] px-3 py-2 text-xs text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
              >
                <option value="" disabled>
                  {task.claimed_by ? "Reassign to…" : "Assign to…"}
                </option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[#001A3D] px-4 py-2 text-xs font-semibold text-[#FFB84D] transition-colors hover:bg-[#011b3e]"
              >
                Assign
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            {canClaim && (
              <form action={claimTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="rounded-full bg-[#FFB84D] px-4 py-1.5 text-xs font-semibold text-[#291800] shadow-sm transition-colors hover:bg-[#f5a84a]"
                >
                  Claim
                </button>
              </form>
            )}
            {canStart && (
              <form action={markTaskInProgress}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="rounded-full bg-sky-100 px-4 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-200"
                >
                  {isManager && task.claimed_by !== userId ? "Set in progress" : "Start"}
                </button>
              </form>
            )}
            {canComplete && (
              <form action={markTaskCompleted}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
                >
                  Complete
                </button>
              </form>
            )}
            {canUnassign && (
              <form action={unassignTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="rounded-full bg-[#001A3D]/10 px-4 py-1.5 text-xs font-semibold text-[#001A3D] transition-colors hover:bg-[#001A3D]/15"
                >
                  Unassign
                </button>
              </form>
            )}
            {canReopenCompleted && (
              <form action={reopenTaskFromCompleted}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="rounded-full bg-sky-100 px-4 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-200"
                >
                  Back to in progress
                </button>
              </form>
            )}
            {canApprove && (
              <form action={approveTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  className="rounded-full bg-[#FFB84D] px-4 py-1.5 text-xs font-semibold text-[#291800] shadow-sm transition-colors hover:bg-[#f5a84a]"
                >
                  Approve
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {isTerminal && (
        <p className="mt-3 text-xs text-[#001A3D]/40">Approved — no further changes.</p>
      )}
    </div>
  );
}

