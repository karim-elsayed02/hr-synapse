"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";

interface Branch {
  id: string;
  name: string;
}

interface SubBranch {
  id: string;
  name: string;
  branch_id: string | null;
}

interface CreateTaskSheetProps {
  /** When false, button still shows; dialog explains that only admins/managers can create. */
  canCreate: boolean;
  branches: Branch[];
  subBranches: SubBranch[];
}

export function CreateTaskSheet({ canCreate, branches, subBranches }: CreateTaskSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");

  const filteredSubs = selectedBranch
    ? subBranches.filter((s) => s.branch_id === selectedBranch)
    : subBranches;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        title: String(fd.get("title") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        branchId: String(fd.get("branchId") ?? "").trim() || null,
        subBranchId: String(fd.get("subBranchId") ?? "").trim() || null,
        assignedHours: Number(fd.get("assignedHours")) || 1,
        dueDate: String(fd.get("dueDate") ?? "").trim() || null,
      };

      const res = await fetch("/api/tasks/create-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(typeof json.error === "string" ? json.error : "Failed to create task");
        return;
      }

      setOpen(false);
      setSelectedBranch("");
      router.refresh();
    } catch (err) {
      console.error("Create task failed:", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full bg-[#FFB84D] px-5 py-2.5 text-sm font-semibold text-[#291800] shadow-md transition-colors hover:bg-[#f5a84a]">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create Task
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
        <DialogHeader className="px-6 pb-0 pt-6">
          <DialogTitle className="font-display text-xl font-semibold text-[#001A3D]">
            Create new task
          </DialogTitle>
        </DialogHeader>

        {!canCreate ? (
          <div className="space-y-4 px-6 pb-6 pt-2">
            <p className="text-sm leading-relaxed text-[#001A3D]/70">
              Only <span className="font-medium text-[#001A3D]">administrators</span> and{" "}
              <span className="font-medium text-[#001A3D]">managers</span> can create tasks. Ask your
              line manager if you need a new task added to the board.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-full bg-[#f3f4f5] px-5 py-3 text-sm font-semibold text-[#001A3D] transition-colors hover:bg-[#ebeced]"
            >
              Close
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
          {submitError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200/80">
              {submitError}
            </p>
          )}
          <fieldset disabled={pending} className="space-y-5">
            <div>
              <label htmlFor="ct-title" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                Title
              </label>
              <input
                id="ct-title"
                name="title"
                required
                className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] placeholder:text-[#001A3D]/35 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                placeholder="e.g. Review safeguarding policy draft"
              />
            </div>

            <div>
              <label htmlFor="ct-desc" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                Description
              </label>
              <textarea
                id="ct-desc"
                name="description"
                rows={3}
                className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] placeholder:text-[#001A3D]/35 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                placeholder="Optional task details"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ct-branch" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                  Branch
                </label>
                <select
                  id="ct-branch"
                  name="branchId"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                >
                  <option value="">None</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ct-sub" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                  Sub-branch
                </label>
                <select
                  id="ct-sub"
                  name="subBranchId"
                  className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                >
                  <option value="">None</option>
                  {filteredSubs.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ct-hours" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                  Assigned hours
                </label>
                <input
                  id="ct-hours"
                  name="assignedHours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  defaultValue="1"
                  required
                  className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                />
              </div>

              <div>
                <label htmlFor="ct-due" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                  Due date
                </label>
                <input
                  id="ct-due"
                  name="dueDate"
                  type="date"
                  className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                />
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-[#FFB84D] px-5 py-3 text-sm font-semibold text-[#291800] shadow-md transition-colors hover:bg-[#f5a84a] disabled:opacity-60"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </span>
            ) : (
              "Create task"
            )}
          </button>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
