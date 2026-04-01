"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type BranchRel = { id: string; name: string } | { id: string; name: string }[] | null;
type ProfileRel =
  | { id: string; full_name: string | null }
  | { id: string; full_name: string | null }[]
  | null;

export type RecentTaskLogRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  branch: BranchRel;
  claimed_by_profile: ProfileRel;
};

function rel<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-[#FFB84D]/15 text-[#291800]",
    claimed: "bg-amber-100 text-amber-800",
    in_progress: "bg-sky-100 text-sky-700",
    completed: "bg-emerald-100 text-emerald-700",
    approved: "bg-emerald-50 text-emerald-600",
    cancelled: "bg-[#001A3D]/8 text-[#001A3D]/50",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${styles[status] ?? styles.open}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function matchesQuery(task: RecentTaskLogRow, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;

  const title = (task.title ?? "").toLowerCase();
  const id = task.id.toLowerCase();
  const shortId = task.id.slice(0, 8).toLowerCase();
  const claimer = rel(task.claimed_by_profile);
  const assigneeName = (claimer?.full_name ?? "").toLowerCase();

  return (
    title.includes(q) ||
    id.includes(q) ||
    shortId.includes(q) ||
    assigneeName.includes(q)
  );
}

export function RecentTaskLogs({ tasks }: { tasks: RecentTaskLogRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => tasks.filter((t) => matchesQuery(t, query)), [tasks, query]);

  return (
    <div className="curator-card overflow-hidden p-0">
      <div className="flex flex-col gap-4 px-6 pb-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-[#001A3D]">Recent Task Logs</h2>
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by task, ID, or assignee…"
            className="w-full rounded-full border-0 bg-[#f3f4f5] py-2.5 pl-10 pr-4 text-sm text-[#001A3D] placeholder:text-[#001A3D]/40 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
            aria-label="Filter task logs"
          />
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="px-6 pb-8 pt-4 text-center text-sm text-[#001A3D]/40">No task activity yet.</p>
      ) : filtered.length === 0 ? (
        <p className="px-6 pb-8 pt-2 text-center text-sm text-[#001A3D]/45">
          No tasks match “{query.trim()}”.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#001A3D]/40">
                <th className="px-6 py-3">Task details</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const branch = rel(task.branch);
                const claimer = rel(task.claimed_by_profile);
                return (
                  <tr key={task.id} className="transition-colors hover:bg-[#f8f9fa]">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[#001A3D]">{task.title}</p>
                      <p className="mt-0.5 text-xs text-[#001A3D]/40">ID: {task.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-4 text-[#001A3D]/65">{branch?.name ?? "—"}</td>
                    <td className="px-4 py-4">
                      {claimer ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-[10px] font-semibold text-[#FFB84D]">
                            {claimer.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                          <span className="text-[#001A3D]/75">{claimer.full_name ?? "Unknown"}</span>
                        </div>
                      ) : (
                        <span className="text-[#001A3D]/35">Unclaimed</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[#001A3D]/55">
                      {formatShortDate(task.created_at) ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <StatusPill status={task.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
