"use client";

import { useMemo, useState } from "react";
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
import {
  normalizeBranchSlug,
  normalizeSubBranchSlug,
  BRANCHES_WITH_SUB_BRANCHES,
} from "@/lib/utils/org-structure";
import {
  filterAssignableStaff,
  type CreatorProfileSlice,
  type StaffProfileSlice,
} from "@/lib/utils/task-assignees";

interface Branch {
  id: string;
  name: string;
}

type BranchScopeRow = {
  rowId: string;
  branchId: string;
  subBranchId: string;
};

interface CreateTaskSheetProps {
  canCreate: boolean;
  branches: Branch[];
  subBranches: SubBranchRow[];
  creator: CreatorProfileSlice;
  assignableStaff: StaffProfileSlice[];
}

function newScopeRow(): BranchScopeRow {
  return {
    rowId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    branchId: "",
    subBranchId: "",
  };
}

function branchHasSubBranches(branchId: string, branches: Branch[]): boolean {
  const name = branches.find((b) => b.id === branchId)?.name ?? "";
  return BRANCHES_WITH_SUB_BRANCHES.has(normalizeBranchSlug(name) as never);
}

export function CreateTaskSheet({
  canCreate,
  branches,
  subBranches,
  creator,
  assignableStaff,
}: CreateTaskSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [branchScopes, setBranchScopes] = useState<BranchScopeRow[]>([newScopeRow()]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [paymentMode, setPaymentMode] = useState<"hours" | "fixed">("hours");
  const [isAdminOnly, setIsAdminOnly] = useState(false);

  const creatorBranchSlug = normalizeBranchSlug(creator.branch ?? "");
  const isBranchLeadCreator = creator.role === "branch_lead";

  const selectableBranches = useMemo(() => {
    if (!isBranchLeadCreator || !creatorBranchSlug) return branches;
    return branches.filter((b) => normalizeBranchSlug(b.name) === creatorBranchSlug);
  }, [branches, isBranchLeadCreator, creatorBranchSlug]);

  const filledScopes = useMemo(
    () => branchScopes.filter((row) => row.branchId),
    [branchScopes],
  );

  const usedBranchIds = useMemo(
    () => new Set(filledScopes.map((row) => row.branchId)),
    [filledScopes],
  );

  const scopeSlugsForAssignee = useMemo(
    () =>
      filledScopes.map((row) => {
        const branchName = branches.find((b) => b.id === row.branchId)?.name ?? "";
        const subName = subBranches.find((s) => s.id === row.subBranchId)?.name ?? "";
        return {
          branchSlug: normalizeBranchSlug(branchName),
          subBranchSlug: row.subBranchId ? normalizeSubBranchSlug(subName) : null,
        };
      }),
    [filledScopes, branches, subBranches],
  );

  const assigneesForTask = useMemo(
    () =>
      filterAssignableStaff(creator, assignableStaff, {
        branchScopes: scopeSlugsForAssignee.length > 0 ? scopeSlugsForAssignee : undefined,
      }),
    [creator, assignableStaff, scopeSlugsForAssignee],
  );

  function updateScopeRow(rowId: string, patch: Partial<Omit<BranchScopeRow, "rowId">>) {
    setBranchScopes((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const next = { ...row, ...patch };
        if (patch.branchId !== undefined && patch.branchId !== row.branchId) {
          next.subBranchId = "";
        }
        return next;
      }),
    );
    setSelectedAssignee("");
  }

  function addScopeRow() {
    setBranchScopes((prev) => [...prev, newScopeRow()]);
  }

  function removeScopeRow(rowId: string) {
    setBranchScopes((prev) => (prev.length <= 1 ? [newScopeRow()] : prev.filter((r) => r.rowId !== rowId)));
    setSelectedAssignee("");
  }

  function resetForm() {
    setBranchScopes([newScopeRow()]);
    setSelectedAssignee("");
    setPaymentMode("hours");
    setIsAdminOnly(false);
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("is_admin", isAdminOnly ? "true" : "false");
      fd.set("paymentMode", paymentMode);

      const payload = filledScopes.map((row) => ({
        branchId: row.branchId,
        subBranchId: row.subBranchId || null,
      }));
      fd.set("branchScopes", JSON.stringify(payload));

      if (paymentMode === "hours") {
        fd.delete("fixedPaymentAmount");
      } else {
        fd.delete("assignedHours");
      }
      if (!selectedAssignee) {
        fd.delete("assigneeId");
      }

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
      resetForm();
      router.refresh();
    } catch (err) {
      console.error("Create task failed:", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const selectClass =
    "w-full rounded-xl bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full bg-[#FFB84D] px-5 py-2.5 text-sm font-semibold text-[#291800] shadow-md transition-colors hover:bg-[#f5a84a]">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create Task
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,820px)] max-w-lg flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
        <DialogHeader className="shrink-0 px-6 pb-0 pt-6">
          <DialogTitle className="font-display text-xl font-semibold text-[#001A3D]">
            Create new task
          </DialogTitle>
        </DialogHeader>

        {!canCreate ? (
          <div className="space-y-4 px-6 pb-6 pt-2">
            <p className="text-sm leading-relaxed text-[#001A3D]/70">
              Only <span className="font-medium text-[#001A3D]">admins</span>,{" "}
              <span className="font-medium text-[#001A3D]">executives</span>, and{" "}
              <span className="font-medium text-[#001A3D]">branch leads</span> can create tasks. Ask
              your branch lead if you need a new task added to the board.
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
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {submitError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200/80">
                  {submitError}
                </p>
              )}
              <fieldset disabled={pending} className="space-y-4">
                <div>
                  <label htmlFor="ct-title" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                    Title
                  </label>
                  <input
                    id="ct-title"
                    name="title"
                    required
                    className="w-full rounded-xl bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#001A3D] placeholder:text-[#001A3D]/35 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
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
                    rows={2}
                    className="w-full rounded-xl bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#001A3D] placeholder:text-[#001A3D]/35 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                    placeholder="Optional task details"
                  />
                </div>

                <div className="space-y-4">
                  {branchScopes.map((row, index) => {
                    const showSub = row.branchId && branchHasSubBranches(row.branchId, branches);
                    return (
                      <div key={row.rowId} className="space-y-4">
                        {index > 0 ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-[#001A3D]/80">
                              Branch {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeScopeRow(row.rowId)}
                              className="text-xs text-[#001A3D]/45 transition-colors hover:text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}

                        {index === 0 ? (
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                              Branch{" "}
                              <span className="font-normal text-[#001A3D]/45">(optional)</span>
                            </label>
                            <select
                              value={row.branchId}
                              onChange={(e) =>
                                updateScopeRow(row.rowId, { branchId: e.target.value })
                              }
                              className={selectClass}
                            >
                              <option value="">None</option>
                              {selectableBranches.map((b) => (
                                <option
                                  key={b.id}
                                  value={b.id}
                                  disabled={usedBranchIds.has(b.id) && b.id !== row.branchId}
                                >
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <select
                            value={row.branchId}
                            onChange={(e) => updateScopeRow(row.rowId, { branchId: e.target.value })}
                            className={selectClass}
                          >
                            <option value="">None</option>
                            {selectableBranches.map((b) => (
                              <option
                                key={b.id}
                                value={b.id}
                                disabled={usedBranchIds.has(b.id) && b.id !== row.branchId}
                              >
                                {b.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {showSub ? (
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                              Sub-branch{" "}
                              <span className="font-normal text-[#001A3D]/45">(optional)</span>
                            </label>
                            <select
                              value={row.subBranchId}
                              onChange={(e) =>
                                updateScopeRow(row.rowId, { subBranchId: e.target.value })
                              }
                              className={selectClass}
                            >
                              <option value="">Whole branch</option>
                              {subBranches.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addScopeRow}
                    disabled={
                      filledScopes.length === 0 || filledScopes.length >= selectableBranches.length
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#FFB84D] transition-colors hover:text-[#f5a84a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" strokeWidth={2.5} />
                    add another branch
                  </button>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#001A3D]/80">Payment</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode("hours")}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        paymentMode === "hours"
                          ? "bg-[#001A3D] text-[#FFB84D]"
                          : "bg-[#f8f9fa] text-[#001A3D]/70 hover:bg-[#f3f4f5]"
                      }`}
                    >
                      By hours
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode("fixed")}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        paymentMode === "fixed"
                          ? "bg-[#001A3D] text-[#FFB84D]"
                          : "bg-[#f8f9fa] text-[#001A3D]/70 hover:bg-[#f3f4f5]"
                      }`}
                    >
                      Fixed amount (£)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {paymentMode === "hours" ? (
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
                        className="w-full rounded-xl bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="ct-fixed" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                        Fixed payment (GBP)
                      </label>
                      <input
                        id="ct-fixed"
                        name="fixedPaymentAmount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="e.g. 25"
                        required
                        className="w-full rounded-xl bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="ct-due" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                      Due date
                    </label>
                    <input
                      id="ct-due"
                      name="dueDate"
                      type="date"
                      className="w-full rounded-xl bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                    />
                  </div>
                </div>

                {assignableStaff.length > 0 && (
                  <div>
                    <label htmlFor="ct-assignee" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                      Assign to <span className="font-normal text-[#001A3D]/45">(optional)</span>
                    </label>
                    <select
                      id="ct-assignee"
                      name="assigneeId"
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">No one — post as open task</option>
                      {assigneesForTask.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name || s.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    {filledScopes.length > 0 && assigneesForTask.length === 0 && (
                      <p className="mt-1 text-xs text-[#001A3D]/45">
                        No assignable staff for the selected branch scope.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="ct-file" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                    Attachment <span className="font-normal text-[#001A3D]/45">(optional, max 15 MB)</span>
                  </label>
                  <input
                    id="ct-file"
                    name="attachment"
                    type="file"
                    className="w-full text-sm text-[#001A3D] file:mr-3 file:rounded-lg file:border-0 file:bg-[#001A3D]/8 file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#001A3D]"
                  />
                </div>

                <div>
                  <label htmlFor="ct-priority" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                    Priority
                  </label>
                  <select
                    id="ct-priority"
                    name="priority"
                    defaultValue="low"
                    className={selectClass}
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
                      <span className="text-sm font-medium text-[#001A3D]">Leads &amp; above only</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#001A3D]/50">
                      Only admins, executives, branch leads, and sub-branch leads will see this task
                    </p>
                  </div>
                </div>
              </fieldset>
            </div>

            <div className="shrink-0 border-t border-[#001A3D]/8 px-6 py-4">
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
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
