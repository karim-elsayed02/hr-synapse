"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Filter,
  FolderOpen,
  Layers,
  PlayCircle,
  PlusCircle,
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

type PayrollBatch = {
  id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
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

function exportCsv(rows: PayrollEntry[]) {
  const headers = ["Staff", "Email", "Role", "Branch", "Task", "Hours", "Rate", "Total pay", "Status", "Paid at", "Created"];
  const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const p = one(r.profile);
      const t = one(r.task);
      return [esc(p?.full_name), esc(p?.email), esc(p?.role), esc(p?.branch), esc(t?.title), r.hours, r.hourly_rate, r.total_pay, r.status, esc(r.paid_at?.slice(0, 10)), esc(r.created_at?.slice(0, 10))].join(",");
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
  const [hourlyRate, setHourlyRate] = useState("");
  const [hoursOverride, setHoursOverride] = useState("");

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [payingEntry, setPayingEntry] = useState<PayrollEntry | null>(null);
  const [payHours, setPayHours] = useState("");
  const [payRate, setPayRate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  /* ---- Batches state ---- */
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [batchLoading, setBatchLoading] = useState(true);
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [batchTitle, setBatchTitle] = useState("");
  const [batchStart, setBatchStart] = useState("");
  const [batchEnd, setBatchEnd] = useState("");
  const [createBatchLoading, setCreateBatchLoading] = useState(false);
  const [createBatchError, setCreateBatchError] = useState<string | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignBatchId, setAssignBatchId] = useState("");
  const [assignSelection, setAssignSelection] = useState<Set<string>>(new Set());
  const [assignLoading, setAssignLoading] = useState(false);

  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

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

  useEffect(() => { fetchEntries(); fetchBatches(); }, [fetchEntries, fetchBatches]);

  /* ---- Entries filters ---- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = entries.filter((e) => {
      const p = one(e.profile);
      const t = one(e.task);
      const matchQ =
        !q ||
        (p?.full_name ?? "").toLowerCase().includes(q) ||
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

  const totalPay = useMemo(() => filtered.reduce((s, e) => s + Number(e.total_pay), 0), [filtered]);
  const totalHours = useMemo(() => filtered.reduce((s, e) => s + Number(e.hours), 0), [filtered]);
  const paidCount = useMemo(() => filtered.filter((e) => e.status === "paid").length, [filtered]);
  const unpaidCount = useMemo(() => filtered.filter((e) => e.status === "unpaid").length, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => { setPage((p) => Math.min(Math.max(1, p), totalPages)); }, [totalPages]);

  const selectedTask = approvedTasks.find((t) => t.id === selectedTaskId) ?? null;
  const effectiveHours = parseFloat(hoursOverride) || selectedTask?.assigned_hours || 0;
  const effectiveRate = parseFloat(hourlyRate) || 0;
  const computedPay = effectiveHours * effectiveRate;

  /* Unassigned unpaid entries (for assign-to-batch modal) */
  const unassignedUnpaid = useMemo(
    () => entries.filter((e) => e.status === "unpaid" && !e.payroll_batch_id),
    [entries]
  );

  /* ---- Entry handlers ---- */
  function resetModal() {
    setSelectedTaskId("");
    setHourlyRate("");
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
        body: JSON.stringify({ task_id: selectedTaskId, hours: effectiveHours, hourly_rate: effectiveRate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create entry");
      setAddSuccess(true);
      await fetchEntries();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  }

  function openPayDialog(entry: PayrollEntry) {
    setPayingEntry(entry);
    setPayHours(String(entry.hours));
    setPayRate(String(entry.hourly_rate));
    setPayAmount(String(Number(entry.hours) * Number(entry.hourly_rate)));
    setPayError(null);
  }

  async function handleMarkPaid() {
    if (!payingEntry) return;
    setPayLoading(true);
    setPayError(null);
    try {
      const amount = parseFloat(payAmount);
      const hours = parseFloat(payHours);
      const rate = parseFloat(payRate);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      const res = await fetch("/api/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payingEntry.id,
          status: "paid",
          amount_paid: amount,
          hours: hours > 0 ? hours : undefined,
          hourly_rate: rate > 0 ? rate : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setPayingEntry(null);
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPayLoading(false);
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
  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    setCreateBatchLoading(true);
    setCreateBatchError(null);
    try {
      const res = await fetch("/api/payroll/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: batchTitle, period_start: batchStart || null, period_end: batchEnd || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create batch");
      setCreateBatchOpen(false);
      setBatchTitle("");
      setBatchStart("");
      setBatchEnd("");
      await fetchBatches();
    } catch (err) {
      setCreateBatchError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreateBatchLoading(false);
    }
  }

  function openAssignModal(batchId: string) {
    setAssignBatchId(batchId);
    setAssignSelection(new Set());
    setAssignOpen(true);
  }

  function toggleAssignEntry(id: string) {
    setAssignSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssignEntries() {
    if (!assignBatchId || assignSelection.size === 0) return;
    setAssignLoading(true);
    try {
      const res = await fetch("/api/payroll/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", batch_id: assignBatchId, entry_ids: Array.from(assignSelection) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }
      setAssignOpen(false);
      await Promise.all([fetchEntries(), fetchBatches()]);
    } catch (err) {
      console.error(err);
    } finally {
      setAssignLoading(false);
    }
  }

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
                <DialogDescription className="text-[#001A3D]/60">Select an approved task and set the hourly rate.</DialogDescription>
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
                  <div className="rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D]/70">
                    <p><span className="font-medium">Staff:</span> {one(selectedTask.claimed_by_profile)?.full_name ?? "—"}</p>
                    <p><span className="font-medium">Task hours:</span> {selectedTask.assigned_hours}h</p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pay-hours">Hours</Label>
                    <Input id="pay-hours" type="number" min="0.5" step="0.5" placeholder={String(selectedTask?.assigned_hours ?? "")} value={hoursOverride} onChange={(e) => setHoursOverride(e.target.value)} className="rounded-xl border-[#001A3D]/15" disabled={addLoading} />
                    <p className="text-xs text-[#001A3D]/40">Leave blank to use task hours</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay-rate">Hourly rate (£)</Label>
                    <Input id="pay-rate" type="number" min="0.01" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="rounded-xl border-[#001A3D]/15" required disabled={addLoading} />
                  </div>
                </div>
                <div className="rounded-xl bg-[#f8f9fa] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#001A3D]/45">Total pay</p>
                  <p className="font-display mt-1 text-2xl font-semibold text-[#001A3D]">{currency(computedPay)}</p>
                </div>
                {addError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{addError}</p>}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" className="rounded-full border-[#001A3D]/20" disabled={addLoading} onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full bg-[#FFB84D] font-semibold text-[#291800] hover:bg-[#f5a84a]" disabled={addLoading || !selectedTaskId || computedPay <= 0}>{addLoading ? "Saving…" : "Add payment"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Entry Dialog */}
      <Dialog open={!!payingEntry} onOpenChange={(open) => { if (!open) setPayingEntry(null); }}>
        <DialogContent className="max-w-[460px] rounded-2xl border-[#001A3D]/10 bg-white text-[#001A3D]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Mark as paid</DialogTitle>
            <DialogDescription className="text-[#001A3D]/60">Set hours, rate, and amount, then confirm payment.</DialogDescription>
          </DialogHeader>
          {payingEntry && (
            <div className="grid gap-4 py-2">
              <div className="rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D]/70 space-y-1">
                <p><span className="font-medium">Staff:</span> {one(payingEntry.profile)?.full_name ?? "—"}</p>
                <p><span className="font-medium">Task:</span> {one(payingEntry.task)?.title ?? "—"}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pay-d-hours">Hours</Label>
                  <Input id="pay-d-hours" type="number" min="0.5" step="0.5" value={payHours} onChange={(e) => { setPayHours(e.target.value); setPayAmount(String((parseFloat(e.target.value) || 0) * (parseFloat(payRate) || 0))); }} className="rounded-xl border-[#001A3D]/15" disabled={payLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-d-rate">Hourly rate (£)</Label>
                  <Input id="pay-d-rate" type="number" min="0.01" step="0.01" value={payRate} onChange={(e) => { setPayRate(e.target.value); setPayAmount(String((parseFloat(payHours) || 0) * (parseFloat(e.target.value) || 0))); }} className="rounded-xl border-[#001A3D]/15" disabled={payLoading} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-d-amount">Total amount (£)</Label>
                <Input id="pay-d-amount" type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="rounded-xl border-[#001A3D]/15 text-lg font-semibold" disabled={payLoading} />
                <p className="text-xs text-[#001A3D]/40">Auto-calculated from hours × rate. Override if needed.</p>
              </div>
              {payError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{payError}</p>}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full border-[#001A3D]/20" disabled={payLoading} onClick={() => setPayingEntry(null)}>Cancel</Button>
            <Button type="button" onClick={handleMarkPaid} className="rounded-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700" disabled={payLoading || !payAmount || parseFloat(payAmount) <= 0}>
              <DollarSign className="mr-1 h-4 w-4" />
              {payLoading ? "Processing…" : `Pay ${payAmount ? currency(parseFloat(payAmount)) : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Batch Dialog */}
      <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
        <DialogContent className="max-w-[460px] rounded-2xl border-[#001A3D]/10 bg-white text-[#001A3D]">
          <form onSubmit={handleCreateBatch}>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Create batch</DialogTitle>
              <DialogDescription className="text-[#001A3D]/60">Group payroll entries into a pay run for a specific period.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="batch-title">Batch title</Label>
                <Input id="batch-title" placeholder="e.g. April 2026 Week 1" value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} className="rounded-xl border-[#001A3D]/15" required disabled={createBatchLoading} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="batch-start">Period start</Label>
                  <Input id="batch-start" type="date" value={batchStart} onChange={(e) => setBatchStart(e.target.value)} className="rounded-xl border-[#001A3D]/15" disabled={createBatchLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-end">Period end</Label>
                  <Input id="batch-end" type="date" value={batchEnd} onChange={(e) => setBatchEnd(e.target.value)} className="rounded-xl border-[#001A3D]/15" disabled={createBatchLoading} />
                </div>
              </div>
              {createBatchError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{createBatchError}</p>}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-full border-[#001A3D]/20" disabled={createBatchLoading} onClick={() => setCreateBatchOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-full bg-[#FFB84D] font-semibold text-[#291800] hover:bg-[#f5a84a]" disabled={createBatchLoading || !batchTitle.trim()}>{createBatchLoading ? "Creating…" : "Create batch"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Entries to Batch Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[85vh] max-w-[520px] overflow-y-auto rounded-2xl border-[#001A3D]/10 bg-white text-[#001A3D]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add entries to batch</DialogTitle>
            <DialogDescription className="text-[#001A3D]/60">Select unpaid entries to include in this batch.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {unassignedUnpaid.length === 0 ? (
              <p className="rounded-xl bg-[#f8f9fa] px-4 py-6 text-center text-sm text-[#001A3D]/50">No unassigned unpaid entries available.</p>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (assignSelection.size === unassignedUnpaid.length) setAssignSelection(new Set());
                    else setAssignSelection(new Set(unassignedUnpaid.map((e) => e.id)));
                  }}
                  className="text-xs font-medium text-[#001A3D]/50 hover:text-[#001A3D] transition"
                >
                  {assignSelection.size === unassignedUnpaid.length ? "Deselect all" : "Select all"}
                </button>
                {unassignedUnpaid.map((entry) => {
                  const p = one(entry.profile);
                  const t = one(entry.task);
                  const checked = assignSelection.has(entry.id);
                  return (
                    <label
                      key={entry.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${checked ? "border-[#FFB84D] bg-[#FFB84D]/5" : "border-[#001A3D]/10 hover:bg-[#f8f9fa]"}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleAssignEntry(entry.id)} className="h-4 w-4 rounded border-[#001A3D]/20 text-[#FFB84D] focus:ring-[#FFB84D]/30" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#001A3D] truncate">{p?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-[#001A3D]/50 truncate">{t?.title ?? "—"} • {currency(Number(entry.hours) * Number(entry.hourly_rate))}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-full border-[#001A3D]/20" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleAssignEntries} className="rounded-full bg-[#FFB84D] font-semibold text-[#291800] hover:bg-[#f5a84a]" disabled={assignLoading || assignSelection.size === 0}>
              {assignLoading ? "Assigning…" : `Add ${assignSelection.size} ${assignSelection.size === 1 ? "entry" : "entries"}`}
            </Button>
          </DialogFooter>
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
            <span className="text-[#001A3D]/35"> • </span>
            <span className="font-medium text-[#001A3D]/70">{batches.length}</span> batches
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {tab === "entries" && (
            <>
              <button type="button" onClick={() => exportCsv(filtered)} className="inline-flex h-11 items-center gap-2 rounded-3xl border border-[#001A3D]/15 bg-white px-5 text-sm font-semibold text-[#001A3D] shadow-[0_8px_24px_rgba(0,26,61,0.06)] transition hover:bg-[#f8f9fa]">
                <Download className="h-4 w-4" strokeWidth={2} /> Export CSV
              </button>
              {isAdmin && (
                <button type="button" onClick={() => { resetModal(); setAddOpen(true); }} className="inline-flex h-11 items-center gap-2 rounded-3xl bg-[#FFB84D] px-5 text-sm font-semibold text-[#291800] shadow-[0_8px_24px_rgba(0,26,61,0.06)] transition hover:bg-[#f5a84a]">
                  <PlusCircle className="h-4 w-4" strokeWidth={2} /> Add Payment
                </button>
              )}
            </>
          )}
          {tab === "batches" && isAdmin && (
            <button type="button" onClick={() => { setCreateBatchError(null); setCreateBatchOpen(true); }} className="inline-flex h-11 items-center gap-2 rounded-3xl bg-[#FFB84D] px-5 text-sm font-semibold text-[#291800] shadow-[0_8px_24px_rgba(0,26,61,0.06)] transition hover:bg-[#f5a84a]">
              <PlusCircle className="h-4 w-4" strokeWidth={2} /> Create Batch
            </button>
          )}
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <div className="flex gap-1 rounded-2xl bg-[#f3f4f5] p-1">
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/35" />
                  <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name or task..." className="h-12 w-full rounded-2xl bg-[#f3f4f5] pl-11 pr-4 text-sm text-[#001A3D] outline-none ring-0 transition placeholder:text-[#001A3D]/40 focus:bg-white focus:shadow-[0_0_0_2px_rgba(255,184,77,0.35)]" />
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
                        {isAdmin && <th className="px-4 py-4 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="px-6 py-16 text-center text-sm text-[#001A3D]/50">
                            {entries.length === 0 ? "No payroll entries yet. Approve tasks then click \"Add Payment\"." : "No entries match your filters."}
                          </td>
                        </tr>
                      ) : (
                        paginated.map((row) => {
                          const person = one(row.profile);
                          const task = one(row.task);
                          const isPaid = row.status === "paid";
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
                              <td className="px-4 py-4 align-middle text-sm font-semibold text-[#001A3D]">{currency(Number(row.total_pay))}</td>
                              <td className="px-4 py-4 align-middle">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                  {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                  {isPaid ? "Paid" : "Unpaid"}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-4 align-middle text-right">
                                  {!isPaid ? (
                                    <button type="button" onClick={() => openPayDialog(row)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#001A3D] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#001A3D]/90">
                                      <DollarSign className="h-3.5 w-3.5" /> Pay
                                    </button>
                                  ) : (
                                    <button type="button" disabled={togglingId === row.id} onClick={() => markUnpaid(row)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#001A3D]/15 bg-white px-4 py-2 text-xs font-medium text-[#001A3D]/60 transition hover:bg-[#f3f4f5]">Undo</button>
                                  )}
                                </td>
                              )}
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
                    if (existing) existing.total += Number(row.total_pay);
                    else byStaff.set(sid, { name: p?.full_name ?? "Unknown", total: Number(row.total_pay) });
                  }
                  return Array.from(byStaff.values()).sort((a, b) => b.total - a.total).slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFB84D]/20 text-[10px] font-bold text-[#291800]">{i + 1}</span>
                        <p className="truncate text-sm text-[#001A3D]">{s.name}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[#001A3D]">{currency(s.total)}</p>
                    </div>
                  ));
                })()}
                {entries.length === 0 && <p className="text-xs text-[#001A3D]/40">No data yet.</p>}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ================================================================ */}
      {/*  BATCHES TAB                                                      */}
      {/* ================================================================ */}
      {tab === "batches" && (
        <div className="space-y-6">
          {batchLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#001A3D]/20 border-t-[#FFB84D]" />
            </div>
          ) : batches.length === 0 ? (
            <div className="curator-card flex flex-col items-center justify-center gap-3 py-20 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
              <FolderOpen className="h-10 w-10 text-[#001A3D]/20" />
              <p className="text-sm text-[#001A3D]/50">No batches yet. Create one to start grouping payroll entries.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {batches.map((batch) => {
                const processed = !!batch.processed_at;
                const processor = one(batch.processed_by_profile);
                return (
                  <div key={batch.id} className="curator-card overflow-hidden shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-lg font-semibold text-[#001A3D] truncate">{batch.title}</h3>
                          {(batch.period_start || batch.period_end) && (
                            <p className="mt-0.5 text-xs text-[#001A3D]/50">
                              {fmtDate(batch.period_start)} — {fmtDate(batch.period_end)}
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${processed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {processed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {processed ? "Processed" : "Pending"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#001A3D]/40">Entries</p>
                          <p className="mt-0.5 font-display text-lg font-semibold text-[#001A3D]">{batch.entry_count}</p>
                        </div>
                        <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#001A3D]/40">Total</p>
                          <p className="mt-0.5 font-display text-lg font-semibold text-[#001A3D]">{currency(batch.total_amount)}</p>
                        </div>
                        <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#001A3D]/40">Unpaid</p>
                          <p className="mt-0.5 font-display text-lg font-semibold text-[#001A3D]">{batch.unpaid_count}</p>
                        </div>
                      </div>

                      {processed && processor && (
                        <p className="mt-3 text-xs text-[#001A3D]/40">
                          Processed by {processor.full_name} on {fmtDate(batch.processed_at)}
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 border-t border-[#001A3D]/6 px-5 py-3">
                        <button type="button" onClick={() => openAssignModal(batch.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#001A3D]/12 bg-white px-3 py-1.5 text-xs font-medium text-[#001A3D]/70 transition hover:bg-[#f8f9fa]">
                          <PlusCircle className="h-3.5 w-3.5" /> Add entries
                        </button>
                        {!processed && batch.unpaid_count > 0 && (
                          <button
                            type="button"
                            disabled={processingBatchId === batch.id}
                            onClick={() => handleProcessBatch(batch.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            {processingBatchId === batch.id ? "Processing…" : "Process all"}
                          </button>
                        )}
                        <div className="flex-1" />
                        <button
                          type="button"
                          disabled={deletingBatchId === batch.id}
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs text-red-500/70 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
