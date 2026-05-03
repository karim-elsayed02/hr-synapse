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
import { Plus, Loader2, ShieldCheck } from "lucide-react";
import type { SubBranchRow } from "@/lib/utils/sub-branch-branch";

interface Branch {
  id: string;
  name: string;
}

interface CreateTaskSheetProps {
  /** When false, button still shows; dialog explains that only admins/managers can create. */
  canCreate: boolean;
  branches: Branch[];
  subBranches: SubBranchRow[];
}

export function CreateTaskSheet({ canCreate, branches, subBranches }: CreateTaskSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isAdminOnly, setIsAdminOnly] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("is_admin", isAdminOnly ? "true" : "false");

      const res = await fetch("/api/tasks/create-tasks", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(typeof json.error === "string" ? json.error : "Failed to create task");
        return;
      }

      setOpen(false);
      setSelectedBranch("");
      setIsAdminOnly(false);
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
              <span className="font-medium text-[#001A3D]">branch leads</span> can create tasks. Ask your
              branch lead if you need a new task added to the board.
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
                placeholder="e.g. Review compliance checklist"
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
                  Sub-branch <span className="font-normal text-[#001A3D]/45">(optional)</span>
                </label>
                <select
                  id="ct-sub"
                  name="subBranchId"
                  className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                  title="Optional"
                >
                  <option value="">None</option>
                  {subBranches.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
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
            <div>
              <label htmlFor="ct-file" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                Attachment (optional)
              </label>
              <input
                id="ct-file"
                name="attachment"
                type="file"
                className="w-full text-sm text-[#001A3D] file:mr-3 file:rounded-lg file:border-0 file:bg-[#001A3D]/8 file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#001A3D]"
              />
              <p className="mt-1 text-xs text-[#001A3D]/45">Max 15 MB.</p>
            </div>

            <div>
              <label htmlFor="ct-priority" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                Priority
              </label>
              <select
                id="ct-priority"
                name="priority"
                defaultValue="low"
                className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-[#f8f9fa] px-4 py-3">
              <button
                type="button"
                role="switch"
                aria-checked={isAdminOnly}
                onClick={() => setIsAdminOnly((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                  isAdminOnly ? "bg-[#001A3D]" : "bg-[#001A3D]/20"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    isAdminOnly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#001A3D]/60" />
                  <span className="text-sm font-medium text-[#001A3D]">Admin / Branch Lead / Sub-branch Lead only</span>
                </div>
                <p className="mt-0.5 text-xs text-[#001A3D]/50">
                  Only admins, branch leads, and sub-branch leads will see this task
                </p>
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
