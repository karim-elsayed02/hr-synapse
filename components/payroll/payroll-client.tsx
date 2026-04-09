"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Filter,
  FolderOpen,
  Layers,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TaskRef = {
  id: string;
  title: string | null;
  assigned_hours: number | null;
  status: string | null;
  approved_at: string | null;
};

type ProfileRef = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  branch: string | null;
  hourly_rate?: number | string | null;
};

type PayrollEntry = {
  id: string;
  task_id: string;
  profile_id: string;
  hours: number;
  hourly_rate: number;
  total_pay: number;
  status: string;
  paid_at: string | null;
  payroll_batch_id: string | null;
  created_at: string;
  task: TaskRef | TaskRef[] | null;
  profile: ProfileRef | ProfileRef[] | null;
};

type ApprovedTask = {
  id: string;
  title: string;
  assigned_hours: number;
  approved_at: string | null;
  claimed_by: string;
  claimed_by_profile: ProfileRef | ProfileRef[] | null;
};

type ProcessedByProfile = {
  id: string;
  full_name: string | null;
};

type BatchStaffProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  branch: string | null;
};

type PayrollBatch = {
  id: string;
  title: string;
  month: number;
  year: number;
  total_payment_user_id: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  staff: BatchStaffProfile | BatchStaffProfile[] | null;
  processed_by_profile: ProcessedByProfile | ProcessedByProfile[] | null;
  entry_count: number;
  total_amount: number;
  paid_count: number;
  unpaid_count: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 8;

function one<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

function initials(name: string | null) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function roleBadgeClass(role: string | null) {
  const r = role ?? "staff";
  if (r === "admin") return "border border-[#001A3D]/25 bg-[#001A3D]/8 text-[#001A3D]";
  if (r === "branch_lead") return "border border-sky-200 bg-sky-50 text-sky-800";
  if (r === "sub_branch_lead") return "border border-violet-200 bg-violet-50 text-violet-900";
  return "border border-sky-100 bg-sky-100/80 text-sky-900";
}

function roleLabel(role: string | null) {
  const r = role ?? "staff";
  if (r === "admin") return "ADMIN";
  if (r === "branch_lead") return "BRANCH LEAD";
  if (r === "sub_branch_lead") return "SUB BRANCH LEAD";
  return "STAFF";
}

function currency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function monthYearLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Collect human-readable date fragments for substring search (en-GB). */
function appendIsoDateVariants(iso: string | null | undefined, sink: string[]) {
  if (!iso) return;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return;
  const gb = d.toLocaleDateString("en-GB");
  sink.push(
    d.toISOString().slice(0, 10),
    gb,
    gb.replace(/\//g, "-"),
    gb.replace(/\//g, "."),
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    String(d.getFullYear())
  );
}

function buildEntryDateSearchBlob(e: PayrollEntry): string {
  const parts: string[] = [];
  appendIsoDateVariants(e.created_at, parts);
  appendIsoDateVariants(e.paid_at, parts);
  const t = one(e.task);
  appendIsoDateVariants(t?.approved_at ?? null, parts);
  return parts.join(" | ").toLowerCase();
}

function payrollBatchMatchesQuery(batch: PayrollBatch, q: string): boolean {
  if (!q) return true;
  const staff = one(batch.staff);
  const parts: string[] = [
    (staff?.full_name ?? "").toLowerCase(),
    (staff?.email ?? "").toLowerCase(),
    batch.title.toLowerCase(),
    monthYearLabel(batch.month, batch.year).toLowerCase(),
    String(batch.month),
    String(batch.year),
    `${batch.year}-${String(batch.month).padStart(2, "0")}`,
  ];
  appendIsoDateVariants(batch.created_at, parts);
  appendIsoDateVariants(batch.processed_at, parts);
  const blob = parts.join(" | ").toLowerCase();
  return blob.includes(q);
}

type BatchPayStatus = "paid" | "unpaid" | "partial" | "empty";

function batchPayrollPaymentStatus(batch: PayrollBatch): { kind: BatchPayStatus; label: string } {
  const { entry_count, unpaid_count, paid_count } = batch;
  if (entry_count === 0) return { kind: "empty", label: "No entries" };
  if (unpaid_count === 0) return { kind: "paid", label: "Paid" };
  if (paid_count === 0) return { kind: "unpaid", label: "Unpaid" };
  return {
    kind: "partial",
    label: `${paid_count} paid · ${unpaid_count} unpaid`,
  };
}

function exportCsv(rows: PayrollEntry[]) {
  const headers = ["Staff", "Email", "Role", "Branch", "Task", "Hours", "Rate", "Total pay", "Status", "Paid at", "Created"];
  const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const p = one(r.profile);
      const t = one(r.task);
      const line = Number(r.hours) * Number(r.hourly_rate);
      return [esc(p?.full_name), esc(p?.email), esc(p?.role), esc(p?.branch), esc(t?.title), r.hours, r.hourly_rate, line, r.status, esc(r.paid_at?.slice(0, 10)), esc(r.created_at?.slice(0, 10))].join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `synapse-payroll-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PayrollClient({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<"entries" | "batches">("entries");

  /* ---- Entries state ---- */
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [approvedTasks, setApprovedTasks] = useState<ApprovedTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [hoursOverride, setHoursOverride] = useState("");

  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* ---- Batches state ---- */
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [batchLoading, setBatchLoading] = useState(true);

  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [batchQuery, setBatchQuery] = useState("");
  /** Month keys (e.g. 2026-04) that are collapsed in the batches tab. */
  const [collapsedBatchMonths, setCollapsedBatchMonths] = useState<Set<string>>(() => new Set());

  /* ---- Data fetching ---- */
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      setEntries(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      const res = await fetch("/api/payroll/batches", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch batches");
      setBatches(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setBatchLoading(false);
    }
  }, []);

  async function fetchApprovedTasks() {
    try {
      const res = await fetch("/api/payroll", { method: "PUT", cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch approved tasks");
      setApprovedTasks(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    void fetchEntries();
    void fetchBatches();
  }, [fetchEntries, fetchBatches]);

  const batchGroups = useMemo(() => {
    const map = new Map<string, PayrollBatch[]>();
    for (const b of batches) {
      const key = `${b.year}-${String(b.month).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    const entriesList = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return entriesList.map(([key, list]) => {
      const [y, m] = key.split("-");
      const month = parseInt(m ?? "1", 10);
      const year = parseInt(y ?? "2000", 10);
      list.sort((a, b) => {
        const na = one(a.staff)?.full_name ?? "";
        const nb = one(b.staff)?.full_name ?? "";
        return na.localeCompare(nb);
      });
      return { key, month, year, label: monthYearLabel(month, year), batches: list };
    });
  }, [batches]);

  const filteredBatchGroups = useMemo(() => {
    const q = batchQuery.trim().toLowerCase().replace(/\s+/g, " ");
    if (!q) return batchGroups;
    return batchGroups
      .map((g) => ({
        ...g,
        batches: g.batches.filter((b) => payrollBatchMatchesQuery(b, q)),
      }))
      .filter((g) => g.batches.length > 0);
  }, [batchGroups, batchQuery]);

  const entriesMissingBatch = useMemo(
    () => entries.filter((e) => !e.payroll_batch_id).length,
    [entries]
  );

  /* ---- Entries filters ---- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, " ");
    const matched = entries.filter((e) => {
      const p = one(e.profile);
      const t = one(e.task);
      const dateBlob = buildEntryDateSearchBlob(e);
      const matchQ =
        !q ||
        (p?.full_name ?? "").toLowerCase().includes(q) ||
        dateBlob.includes(q) ||
        (p?.email ?? "").toLowerCase().includes(q) ||
        (t?.title ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchQ && matchStatus;
    });
    return matched.sort((a, b) => {
      if (a.status === "unpaid" && b.status !== "unpaid") return -1;
      if (a.status !== "unpaid" && b.status === "unpaid") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [entries, query, statusFilter]);

  const totalPay = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0),
    [filtered]
  );
  const totalHours = useMemo(() => filtered.reduce((s, e) => s + Number(e.hours), 0), [filtered]);
  const paidCount = useMemo(() => filtered.filter((e) => e.status === "paid").length, [filtered]);
  const unpaidCount = useMemo(() => filtered.filter((e) => e.status === "unpaid").length, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => { setPage((p) => Math.min(Math.max(1, p), totalPages)); }, [totalPages]);

  const selectedTask = approvedTasks.find((t) => t.id === selectedTaskId) ?? null;
  const staffForTask = one(selectedTask?.claimed_by_profile ?? null);
  const profileRateRaw = staffForTask?.hourly_rate;
  const profileRate =
    profileRateRaw != null && profileRateRaw !== ""
      ? Number(profileRateRaw)
      : NaN;
  const hoursOverrideNum = parseFloat(hoursOverride);
  const effectiveHours =
    !Number.isNaN(hoursOverrideNum) && hoursOverrideNum > 0
      ? hoursOverrideNum
      : Number(selectedTask?.assigned_hours ?? 0) || 0;
  const computedPay =
    !Number.isNaN(profileRate) && profileRate > 0 ? effectiveHours * profileRate : 0;

  /* ---- Entry handlers ---- */
  function resetModal() {
    setSelectedTaskId("");
    setHoursOverride("");
    setAddError(null);
    setAddSuccess(false);
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: selectedTaskId,
          hours: effectiveHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create entry");
      setAddSuccess(true);
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  }

  async function markPaid(entry: PayrollEntry) {
    setTogglingId(entry.id);
    try {
      const res = await fetch("/api/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, status: "paid" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  async function markUnpaid(entry: PayrollEntry) {
    setTogglingId(entry.id);
    try {
      const res = await fetch("/api/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, status: "unpaid" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  /* ---- Batch handlers ---- */
  async function handleProcessBatch(batchId: string) {
    setProcessingBatchId(batchId);
    try {
      const res = await fetch("/api/payroll/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process", batch_id: batchId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process");
      }
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingBatchId(null);
    }
  }

  async function handleDeleteBatch(batchId: string) {
    if (!confirm("Delete this batch? Entries will be unlinked, not deleted.")) return;
    setDeletingBatchId(batchId);
    try {
      const res = await fetch("/api/payroll/batches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_id: batchId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingBatchId(null);
    }
  }

  async function handleBackfillBatches() {
    setBackfillLoading(true);
    setBackfillMsg(null);
    try {
      const res = await fetch("/api/payroll/batches/backfill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backfill failed");
      const parts = [`Linked ${data.linked} ${data.linked === 1 ? "entry" : "entries"}`];
      if (data.skipped > 0) parts.push(`${data.skipped} could not be linked`);
      setBackfillMsg(parts.join(". ") + ".");
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      setBackfillMsg(err instanceof Error ? err.message : "Backfill failed");
    } finally {
      setBackfillLoading(false);
    }
  }

  const toggleBatchMonth = useCallback((monthKey: string) => {
    setCollapsedBatchMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  }, []);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* ---- Dialogs ---- */}

      {/* Add Payment Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (open) { resetModal(); fetchApprovedTasks(); } }}>
        <DialogContent className="max-h-[90vh] max-w-[520px] overflow-y-auto rounded-2xl border-[#001A3D]/10 bg-white text-[#001A3D]">
          {addSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Payment recorded</DialogTitle>
                <DialogDescription className="text-[#001A3D]/60">Payroll entry of {currency(computedPay)} has been created.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" className="rounded-full bg-[#001A3D] text-white hover:bg-[#011b3e]" onClick={() => { setAddOpen(false); resetModal(); }}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleAddEntry}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add payment</DialogTitle>
                <DialogDescription className="text-[#001A3D]/60">
                  Select an approved task. Total pay uses task hours (or your override) × the staff member&apos;s hourly rate from their profile.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Approved task</Label>
                  {approvedTasks.length === 0 ? (
                    <p className="rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D]/50">No approved tasks available.</p>
                  ) : (
                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                      <SelectTrigger className="h-10 rounded-xl border-[#001A3D]/15"><SelectValue placeholder="Pick an approved task..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {approvedTasks.map((t) => {
                          const staff = one(t.claimed_by_profile);
                          return <SelectItem key={t.id} value={t.id}>{t.title} — {staff?.full_name ?? "unassigned"} ({t.assigned_hours}h)</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedTask && (
                  <div className="rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D]/70 space-y-1">
                    <p><span className="font-medium">Staff:</span> {staffForTask?.full_name ?? "—"}</p>
                    <p><span className="font-medium">Task hours:</span> {selectedTask.assigned_hours}h</p>
                    <p>
                      <span className="font-medium">Profile hourly rate:</span>{" "}
                      {!Number.isNaN(profileRate) && profileRate > 0 ? (
                        currency(profileRate)
                      ) : (
                        <span className="text-amber-700">Not set — add a rate in Staff Directory first</span>
                      )}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="pay-hours">Hours (optional override)</Label>
                  <Input
                    id="pay-hours"
                    type="number"
                    min="0.5"
                    step="0.5"
                    placeholder={selectedTask ? String(selectedTask.assigned_hours) : ""}
                    value={hoursOverride}
                    onChange={(e) => setHoursOverride(e.target.value)}
                    className="rounded-xl border-[#001A3D]/15"
                    disabled={addLoading}
                  />
                  <p className="text-xs text-[#001A3D]/40">Leave blank to use the task&apos;s assigned hours</p>
                </div>
                <div className="rounded-xl bg-[#f8f9fa] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#001A3D]/45">Total pay (hours × profile rate)</p>
                  <p className="font-display mt-1 text-2xl font-semibold text-[#001A3D]">{currency(computedPay)}</p>
                </div>
                {addError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{addError}</p>}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="rounded-full border-[#001A3D]/20" disabled={addLoading} onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  className="rounded-full bg-[#FFB84D] font-semibold text-[#291800] hover:bg-[#f5a84a]"
                  disabled={
                    addLoading ||
                    !selectedTaskId ||
                    computedPay <= 0 ||
                    Number.isNaN(profileRate) ||
                    profileRate <= 0
                  }
                >
                  {addLoading ? "Saving…" : "Add payment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Page header ---- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#001A3D]/45">
            Directory <span className="text-[#001A3D]/30">›</span> Payroll Overview
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[#001A3D] sm:text-4xl">
            Payroll Overview
          </h1>
          <p className="mt-2 text-sm text-[#001A3D]/55">
            Task-based payroll <span className="text-[#001A3D]/35">•</span>{" "}
            <span className="font-medium text-[#001A3D]/70">{entries.length}</span> entries
            <>
              <span className="text-[#001A3D]/35"> • </span>
              <span className="font-medium text-[#001A3D]/70">{batches.length}</span>{" "}
              monthly {batches.length === 1 ? "batch" : "batches"}
              {!isAdmin ? (
                <span className="text-[#001A3D]/45"> (your entries only)</span>
              ) : null}
            </>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {tab === "entries" && (
            <>
              {isAdmin && (
                <button type="button" onClick={() => exportCsv(filtered)} className="inline-flex h-11 items-center gap-2 rounded-3xl border border-[#001A3D]/15 bg-white px-5 text-sm font-semibold text-[#001A3D] shadow-[0_8px_24px_rgba(0,26,61,0.06)] transition hover:bg-[#f8f9fa]">
                  <Download className="h-4 w-4" strokeWidth={2} /> Export CSV
                </button>
              )}
              {isAdmin && (
                <button type="button" onClick={() => { resetModal(); setAddOpen(true); }} className="inline-flex h-11 items-center gap-2 rounded-3xl bg-[#FFB84D] px-5 text-sm font-semibold text-[#291800] shadow-[0_8px_24px_rgba(0,26,61,0.06)] transition hover:bg-[#f5a84a]">
                  <PlusCircle className="h-4 w-4" strokeWidth={2} /> Add Payment
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <div className="flex max-w-md gap-1 rounded-2xl bg-[#f3f4f5] p-1">
        <button
          type="button"
          onClick={() => setTab("entries")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === "entries" ? "bg-white text-[#001A3D] shadow-sm" : "text-[#001A3D]/50 hover:text-[#001A3D]/70"}`}
        >
          <Layers className="mr-2 inline h-4 w-4" /> Entries
        </button>
        <button
          type="button"
          onClick={() => setTab("batches")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === "batches" ? "bg-white text-[#001A3D] shadow-sm" : "text-[#001A3D]/50 hover:text-[#001A3D]/70"}`}
        >
          <FolderOpen className="mr-2 inline h-4 w-4" /> Batches
        </button>
      </div>

      {/* ================================================================ */}
      {/*  ENTRIES TAB                                                      */}
      {/* ================================================================ */}
      {tab === "entries" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {/* Filters */}
            <div className="curator-card p-6 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
                <div>
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/35" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Staff name, date, or task…"
                      className="h-12 w-full rounded-2xl bg-[#f3f4f5] pl-11 pr-4 text-sm text-[#001A3D] outline-none ring-0 transition placeholder:text-[#001A3D]/40 focus:bg-white focus:shadow-[0_0_0_2px_rgba(255,184,77,0.35)]"
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#001A3D]/40">
                    Dates: entry created, paid, or task approved (e.g. <span className="whitespace-nowrap">2026-04-09</span>,{" "}
                    <span className="whitespace-nowrap">09/04/2026</span>, April 2026).
                  </p>
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-12 rounded-2xl border-0 bg-[#f3f4f5] text-[#001A3D] shadow-none focus:ring-2 focus:ring-[#FFB84D]/40"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="curator-card overflow-hidden shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#001A3D]/20 border-t-[#FFB84D]" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[800px] w-full border-collapse">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#001A3D]/45">
                        <th className="px-6 py-4">Staff member</th>
                        <th className="px-4 py-4">Role</th>
                        <th className="px-4 py-4">Task</th>
                        <th className="px-4 py-4">Hours</th>
                        <th className="px-4 py-4">Rate</th>
                        <th className="px-4 py-4">Total pay</th>
                        <th className="px-4 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-sm text-[#001A3D]/50">
                            {entries.length === 0
                              ? isAdmin
                                ? "No payroll entries yet. Approve tasks, then use Add payment."
                                : "No payroll entries for you yet."
                              : "No entries match your filters."}
                          </td>
                        </tr>
                      ) : (
                        paginated.map((row) => {
                          const person = one(row.profile);
                          const task = one(row.task);
                          const isPaid = row.status === "paid";
                          const lineTotal = Number(row.hours) * Number(row.hourly_rate);
                          return (
                            <tr key={row.id} className="transition-colors hover:bg-[#f8f9fa]/90">
                              <td className="px-6 py-4 align-middle">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                    <AvatarFallback className="bg-linear-to-br from-[#001A3D] to-[#011b3e] text-xs font-semibold text-[#FFB84D]">{initials(person?.full_name ?? null)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#001A3D] truncate">{person?.full_name ?? "Unknown"}</p>
                                    <p className="text-xs text-[#001A3D]/45 truncate">{person?.email ?? "—"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(person?.role ?? null)}`}>{roleLabel(person?.role ?? null)}</span>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <p className="text-sm text-[#001A3D]/80 truncate max-w-[200px]">{task?.title ?? "—"}</p>
                              </td>
                              <td className="px-4 py-4 align-middle text-sm font-medium text-[#001A3D]/80">{Number(row.hours).toFixed(1)}</td>
                              <td className="px-4 py-4 align-middle text-sm text-[#001A3D]/80">{currency(Number(row.hourly_rate))}</td>
                              <td className="px-4 py-4 align-middle text-sm font-semibold text-[#001A3D]">{currency(lineTotal)}</td>
                              <td className="px-4 py-4 align-middle">
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    disabled={togglingId === row.id}
                                    onClick={() => (isPaid ? markUnpaid(row) : markPaid(row))}
                                    title={isPaid ? "Click to mark as unpaid" : "Click to mark as paid"}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB84D]/50 disabled:opacity-50 ${
                                      isPaid
                                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                        : "bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer"
                                    }`}
                                  >
                                    {togglingId === row.id ? (
                                      <span className="inline-block h-3.5 w-8 animate-pulse text-center">…</span>
                                    ) : (
                                      <>
                                        {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                        {isPaid ? "Paid" : "Unpaid"}
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                                  >
                                    {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                    {isPaid ? "Paid" : "Unpaid"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {filtered.length > 0 && (
                <div className="flex flex-col gap-4 border-t border-[#001A3D]/6 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#001A3D]/50">
                    Showing <span className="font-medium text-[#001A3D]/70">{pageStart + 1}</span> to <span className="font-medium text-[#001A3D]/70">{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-[#001A3D]/70">{filtered.length}</span> entries
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-full px-3 py-1.5 text-sm font-medium text-[#001A3D] transition hover:bg-[#f3f4f5] disabled:opacity-40">Prev</button>
                    <span className="text-sm text-[#001A3D]/45">Page {currentPage} / {totalPages}</span>
                    <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-full bg-[#FFB84D] px-4 py-1.5 text-sm font-semibold text-[#291800] transition hover:bg-[#f5a84a] disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-6">
            <div className="overflow-hidden rounded-2xl bg-linear-to-br from-[#001A3D] to-[#011b3e] p-6 text-white shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FFB84D]/90">Total Payroll</p>
              <p className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">{currency(totalPay)}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/20 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Total hours</p>
                  <p className="mt-1 font-display text-xl font-semibold text-white">{totalHours.toFixed(1)}</p>
                </div>
                <div className="rounded-xl bg-black/20 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Entries</p>
                  <p className="mt-1 font-display text-xl font-semibold text-white">{filtered.length}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/20 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">Paid</p>
                  <p className="mt-1 font-display text-xl font-semibold text-white">{paidCount}</p>
                </div>
                <div className="rounded-xl bg-amber-500/20 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">Unpaid</p>
                  <p className="mt-1 font-display text-xl font-semibold text-white">{unpaidCount}</p>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="curator-card p-5 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#001A3D]/70">
                  <TrendingUp className="h-4 w-4 text-[#4DB8FF]" /> Top earners
                </div>
                <div className="mt-3 space-y-3">
                  {(() => {
                    const byStaff = new Map<string, { name: string; total: number }>();
                    for (const row of entries) {
                      const p = one(row.profile);
                      const sid = p?.id ?? "unknown";
                      const existing = byStaff.get(sid);
                      const line = Number(row.hours) * Number(row.hourly_rate);
                      if (existing) existing.total += line;
                      else byStaff.set(sid, { name: p?.full_name ?? "Unknown", total: line });
                    }
                    return Array.from(byStaff.values())
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 5)
                      .map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFB84D]/20 text-[10px] font-bold text-[#291800]">
                              {i + 1}
                            </span>
                            <p className="truncate text-sm text-[#001A3D]">{s.name}</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-[#001A3D]">{currency(s.total)}</p>
                        </div>
                      ));
                  })()}
                  {entries.length === 0 && <p className="text-xs text-[#001A3D]/40">No data yet.</p>}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ================================================================ */}
      {/*  BATCHES TAB                                                      */}
      {/* ================================================================ */}
      {tab === "batches" && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-[#001A3D]/55">
              {isAdmin
                ? "Each staff member gets one batch per calendar month (UK). Totals are the sum of task payments in that batch. New entries are added automatically."
                : "Your pay is grouped by calendar month. Amounts are the sum of your payroll entries for that month."}
            </p>
            {isAdmin && entriesMissingBatch > 0 && (
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <button
                  type="button"
                  disabled={backfillLoading}
                  onClick={() => void handleBackfillBatches()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#001A3D]/15 bg-white px-4 text-sm font-semibold text-[#001A3D] shadow-sm transition hover:bg-[#f8f9fa] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${backfillLoading ? "animate-spin" : ""}`} />
                  {backfillLoading ? "Linking…" : `Link ${entriesMissingBatch} older ${entriesMissingBatch === 1 ? "entry" : "entries"} to batches`}
                </button>
                {backfillMsg && (
                  <p
                    className={`max-w-sm text-right text-xs ${backfillMsg.includes("failed") || backfillMsg.includes("could not") ? "text-amber-800" : "text-emerald-800"}`}
                  >
                    {backfillMsg}
                  </p>
                )}
              </div>
            )}
          </div>

          {!batchLoading && batches.length > 0 && (
            <div className="curator-card p-4 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/35" />
                <input
                  type="search"
                  value={batchQuery}
                  onChange={(e) => setBatchQuery(e.target.value)}
                  placeholder="Filter batches by staff name, month, year, or date…"
                  className="h-11 w-full rounded-2xl bg-[#f3f4f5] pl-11 pr-4 text-sm text-[#001A3D] outline-none ring-0 transition placeholder:text-[#001A3D]/40 focus:bg-white focus:shadow-[0_0_0_2px_rgba(255,184,77,0.35)]"
                />
              </div>
            </div>
          )}

          {batchLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#001A3D]/20 border-t-[#FFB84D]" />
            </div>
          ) : batches.length === 0 ? (
            <div className="curator-card flex flex-col items-center justify-center gap-3 py-20 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              <FolderOpen className="h-10 w-10 text-[#001A3D]/20" />
              <p className="text-sm text-[#001A3D]/50">
                {isAdmin
                  ? "No monthly batches yet. They appear when you add payroll entries."
                  : "No monthly batches yet. Your admin will add payments for your approved tasks."}
              </p>
            </div>
          ) : filteredBatchGroups.length === 0 ? (
            <div className="curator-card flex flex-col items-center justify-center gap-3 py-16 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              <p className="text-sm text-[#001A3D]/50">No batches match your search. Try another name or month.</p>
            </div>
          ) : (
            filteredBatchGroups.map((group) => {
              const collapsed = collapsedBatchMonths.has(group.key);
              const monthTotal = group.batches.reduce((s, b) => s + Number(b.total_amount), 0);
              const monthEntries = group.batches.reduce((s, b) => s + b.entry_count, 0);
              return (
                <section
                  key={group.key}
                  className="curator-card overflow-hidden shadow-[0_8px_24px_rgba(0,26,61,0.06)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleBatchMonth(group.key)}
                    aria-expanded={!collapsed}
                    className="flex w-full min-h-[3.25rem] items-center gap-3 border-b border-[#001A3D]/6 bg-linear-to-r from-[#f8f9fa] to-white px-4 py-3 text-left transition hover:from-[#f3f4f5] sm:px-6"
                  >
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#001A3D]/50 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-display text-base font-semibold text-[#001A3D] sm:text-lg">
                        {group.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-[#001A3D]/45 sm:mt-0 sm:ml-3 sm:inline">
                        {group.batches.length} {group.batches.length === 1 ? "batch" : "batches"}
                        <span className="text-[#001A3D]/30"> · </span>
                        {monthEntries} {monthEntries === 1 ? "entry" : "entries"}
                        <span className="text-[#001A3D]/30"> · </span>
                        <span className="font-medium text-[#001A3D]/65">{currency(monthTotal)}</span> total
                      </span>
                    </div>
                  </button>

                  {!collapsed && (
                    <div className="overflow-x-auto">
                      <table className="min-w-[920px] w-full border-collapse">
                        <thead>
                          <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#001A3D]/45">
                            <th className="whitespace-nowrap px-4 py-3 sm:px-6">Staff</th>
                            {isAdmin ? <th className="whitespace-nowrap px-4 py-3">Role</th> : null}
                            <th className="whitespace-nowrap px-4 py-3">Entries</th>
                            <th className="whitespace-nowrap px-4 py-3">Total owed</th>
                            <th className="whitespace-nowrap px-4 py-3">Payment</th>
                            <th className="whitespace-nowrap px-4 py-3">Pay run</th>
                            {isAdmin ? (
                              <th className="whitespace-nowrap px-4 py-3 text-right sm:pr-6">Actions</th>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody>
                          {group.batches.map((batch) => {
                            const staff = one(batch.staff);
                            const processor = one(batch.processed_by_profile);
                            const processed = !!batch.processed_at;
                            const pay = batchPayrollPaymentStatus(batch);
                            const payClass =
                              pay.kind === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : pay.kind === "unpaid"
                                  ? "bg-amber-50 text-amber-700"
                                  : pay.kind === "partial"
                                    ? "bg-sky-50 text-sky-900"
                                    : "bg-[#f3f4f5] text-[#001A3D]/50";
                            return (
                              <tr
                                key={batch.id}
                                className="border-t border-[#001A3D]/6 transition-colors hover:bg-[#f8f9fa]/90"
                              >
                                <td className="px-4 py-3 align-middle sm:px-6">
                                  <div className="flex min-w-[200px] items-center gap-3">
                                    <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                                      <AvatarFallback className="bg-linear-to-br from-[#001A3D] to-[#011b3e] text-[10px] font-semibold text-[#FFB84D]">
                                        {initials(staff?.full_name ?? null)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-[#001A3D]">
                                        {staff?.full_name ?? "—"}
                                      </p>
                                      <p className="truncate text-xs text-[#001A3D]/45">{staff?.email ?? "—"}</p>
                                    </div>
                                  </div>
                                </td>
                                {isAdmin ? (
                                  <td className="px-4 py-3 align-middle">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(staff?.role ?? null)}`}
                                    >
                                      {roleLabel(staff?.role ?? null)}
                                    </span>
                                  </td>
                                ) : null}
                                <td className="px-4 py-3 align-middle text-sm font-medium tabular-nums text-[#001A3D]/85">
                                  {batch.entry_count}
                                </td>
                                <td className="px-4 py-3 align-middle text-sm font-semibold tabular-nums text-[#001A3D]">
                                  {currency(batch.total_amount)}
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${payClass}`}
                                  >
                                    {pay.kind === "paid" ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <Clock className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    {pay.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                  <div className="flex min-w-[7rem] flex-col gap-0.5">
                                    <span
                                      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${processed ? "bg-emerald-50/80 text-emerald-800" : "bg-[#001A3D]/6 text-[#001A3D]/70"}`}
                                    >
                                      {processed ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                      ) : (
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                      )}
                                      {processed ? "Processed" : "Pending"}
                                    </span>
                                    {processed && processor ? (
                                      <span className="max-w-[14rem] truncate text-[10px] text-[#001A3D]/40">
                                        {processor.full_name} · {fmtDate(batch.processed_at)}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                {isAdmin ? (
                                  <td className="px-4 py-3 align-middle text-right sm:pr-6">
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      {!processed && batch.unpaid_count > 0 ? (
                                        <button
                                          type="button"
                                          disabled={processingBatchId === batch.id}
                                          onClick={() => handleProcessBatch(batch.id)}
                                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                          <PlayCircle className="h-3.5 w-3.5" />
                                          {processingBatchId === batch.id ? "…" : "Pay all"}
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        disabled={deletingBatchId === batch.id}
                                        onClick={() => handleDeleteBatch(batch.id)}
                                        className="inline-flex items-center rounded-lg p-1.5 text-red-500/80 hover:bg-red-50 disabled:opacity-50"
                                        title="Remove batch and unlink entries"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                ) : null}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
