"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Plus, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import type { WorkLogRow, WorkLogStaffOption, WorkLogStatus } from "@/lib/types/staff-work-log";

function one<T>(ref: T | T[] | null | undefined): T | null {
  if (ref == null) return null;
  return Array.isArray(ref) ? ref[0] ?? null : ref;
}

function statusBadge(status: WorkLogStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
          Rejected
        </Badge>
      );
    default:
      return null;
  }
}

type WorkLogClientProps = {
  initialLogs: WorkLogRow[];
  staffOptions: WorkLogStaffOption[];
  currentUserId: string;
  canApprove: boolean;
  seesAll: boolean;
  filterFrom: string;
  filterTo: string;
  filterStaffId: string;
  loadError: string | null;
};

export function WorkLogClient({
  initialLogs,
  staffOptions,
  currentUserId,
  canApprove,
  seesAll,
  filterFrom,
  filterTo,
  filterStaffId,
  loadError,
}: WorkLogClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [nameContains, setNameContains] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const [draftFrom, setDraftFrom] = useState(filterFrom);
  const [draftTo, setDraftTo] = useState(filterTo);
  const [draftStaff, setDraftStaff] = useState(filterStaffId || "all");

  useEffect(() => {
    setDraftFrom(filterFrom);
    setDraftTo(filterTo);
    setDraftStaff(filterStaffId || "all");
  }, [filterFrom, filterTo, filterStaffId]);

  const [formDate, setFormDate] = useState(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [formHours, setFormHours] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const needle = nameContains.trim().toLowerCase();

  const visibleRows = useMemo(() => {
    if (!needle) return initialLogs;
    return initialLogs.filter((row) => {
      const s = one(row.staff);
      const name = (s?.full_name ?? "").toLowerCase();
      const email = (s?.email ?? "").toLowerCase();
      return name.includes(needle) || email.includes(needle);
    });
  }, [initialLogs, needle]);

  const pendingCount = useMemo(
    () => initialLogs.filter((r) => r.status === "pending").length,
    [initialLogs],
  );

  const applyUrlFilters = () => {
    const params = new URLSearchParams();
    params.set("from", draftFrom);
    params.set("to", draftTo);
    if (draftStaff && draftStaff !== "all") {
      params.set("staff", draftStaff);
    }
    router.push(`/work-log?${params.toString()}`);
  };

  const resetAddForm = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    setFormDate(`${y}-${m}-${d}`);
    setFormHours("");
    setFormDescription("");
  };

  const submitEntry = async () => {
    const hours = Number(formHours);
    if (!formDate) {
      toast({ title: "Choose a work date", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      toast({
        title: "Invalid hours",
        description: "Enter a number greater than 0 and at most 24.",
        variant: "destructive",
      });
      return;
    }
    const desc = formDescription.trim();
    if (!desc) {
      toast({ title: "Add a short description", variant: "destructive" });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/work-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        work_date: formDate,
        hours_worked: hours,
        description: desc,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      toast({
        title: "Could not submit",
        description: data.error ?? "Something went wrong.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: data.status === "pending" ? "Request submitted" : "Entry approved",
      description:
        data.status === "pending"
          ? "An admin will review your hours and create payroll if approved."
          : "Payroll entry was created for these hours.",
    });
    setAddOpen(false);
    resetAddForm();
    router.refresh();
  };

  const reviewRequest = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    const body: Record<string, string> = { action };
    if (action === "reject") {
      const reason = window.prompt("Optional reason for rejection:") ?? "";
      if (reason.trim()) body.rejection_reason = reason.trim();
    }

    const res = await fetch(`/api/work-log/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setActingId(null);

    if (!res.ok) {
      toast({
        title: action === "approve" ? "Approval failed" : "Rejection failed",
        description: data.error ?? "Something went wrong.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: action === "approve" ? "Work log approved" : "Work log rejected",
      description:
        action === "approve"
          ? "A payroll entry was created using their hourly rate."
          : "The submitter has been notified.",
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#001A3D]">
            <CalendarClock className="h-7 w-7 text-[#FFB84D]" aria-hidden />
            Work log
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#001A3D]/65">
            {canApprove
              ? "Submit your own hours or review pending requests. Approving a request creates a payroll entry immediately."
              : "Submit hours you worked for admin approval. Once approved, payroll is created from your hourly rate."}
          </p>
          {canApprove && pendingCount > 0 ? (
            <p className="mt-2 text-sm font-medium text-amber-800">
              {pendingCount} request{pendingCount === 1 ? "" : "s"} awaiting approval
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          className="shrink-0 bg-[#FFB84D] text-[#291800] hover:bg-[#ffc266]"
          onClick={() => {
            resetAddForm();
            setAddOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {canApprove ? "Add entry" : "Request hours"}
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load entries ({loadError}). Run{" "}
          <code className="rounded bg-white/80 px-1">scripts/36_work_log_approval.sql</code> in Supabase
          if you have not applied the work log approval migration.
        </div>
      ) : null}

      <div className="curator-card rounded-[var(--curator-radius-xl)] border border-[#001A3D]/8 bg-white p-4 shadow-[var(--curator-shadow)] sm:p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#001A3D]/45">Filters</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="wl-from">From</Label>
              <Input
                id="wl-from"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="border-[#001A3D]/15"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-to">To</Label>
              <Input
                id="wl-to"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="border-[#001A3D]/15"
              />
            </div>
          </div>
          {seesAll ? (
            <div className="w-full space-y-1.5 lg:w-56">
              <Label>Staff</Label>
              <Select value={draftStaff} onValueChange={setDraftStaff}>
                <SelectTrigger className="border-[#001A3D]/15">
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name?.trim() || s.email || s.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="border border-[#001A3D]/12 bg-[#001A3D]/5 text-[#001A3D] hover:bg-[#001A3D]/10"
            onClick={applyUrlFilters}
          >
            Apply date{seesAll ? " & staff" : "s"}
          </Button>
          {seesAll ? (
            <div className="w-full flex-1 space-y-1.5 lg:min-w-[200px] lg:max-w-xs">
              <Label htmlFor="wl-name">Name contains (this page only)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/35" />
                <Input
                  id="wl-name"
                  value={nameContains}
                  onChange={(e) => setNameContains(e.target.value)}
                  placeholder="Filter by name or email…"
                  className="border-[#001A3D]/15 pl-9"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--curator-radius-xl)] border border-[#001A3D]/8 bg-white shadow-[var(--curator-shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[#001A3D]/10 bg-[#f8f9fa] text-xs font-semibold uppercase tracking-wide text-[#001A3D]/55">
              <tr>
                <th className="px-4 py-3">Date</th>
                {seesAll ? <th className="px-4 py-3">Person</th> : null}
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                {canApprove ? <th className="px-4 py-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001A3D]/8">
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={seesAll ? (canApprove ? 6 : 5) : canApprove ? 5 : 4}
                    className="px-4 py-10 text-center text-[#001A3D]/50"
                  >
                    No entries in this range.{" "}
                    {canApprove ? "Click Add entry" : "Click Request hours"} to get started.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const s = one(row.staff);
                  const busy = actingId === row.id;
                  return (
                    <tr key={row.id} className="align-top text-[#001A3D]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#001A3D]/85">{row.work_date}</td>
                      {seesAll ? (
                        <td className="px-4 py-3">
                          <div className="font-medium">{s?.full_name ?? "—"}</div>
                          <div className="text-xs text-[#001A3D]/50">{s?.email ?? ""}</div>
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {Number(row.hours_worked).toFixed(2)}
                      </td>
                      <td className="max-w-md px-4 py-3 text-[#001A3D]/85">
                        {row.description}
                        {row.status === "rejected" && row.rejection_reason ? (
                          <p className="mt-1 text-xs text-rose-700">Reason: {row.rejection_reason}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{statusBadge(row.status)}</td>
                      {canApprove ? (
                        <td className="px-4 py-3">
                          {row.status === "pending" ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => void reviewRequest(row.id, "approve")}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() => void reviewRequest(row.id, "reject")}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#001A3D]/45">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg border-[#001A3D]/10">
          <DialogHeader>
            <DialogTitle className="text-[#001A3D]">
              {canApprove ? "Add work log entry" : "Request work log hours"}
            </DialogTitle>
            <DialogDescription>
              {canApprove
                ? "Your entry will be approved immediately and a payroll line will be created from your hourly rate."
                : "An admin will review this request. If approved, payroll is created from your profile hourly rate × hours."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="wl-form-date">Work date</Label>
                <Input
                  id="wl-form-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="border-[#001A3D]/15"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wl-form-hours">Hours</Label>
                <Input
                  id="wl-form-hours"
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  min={0.01}
                  max={24}
                  placeholder="e.g. 2.5"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  className="border-[#001A3D]/15"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wl-form-desc">What work was done</Label>
              <Textarea
                id="wl-form-desc"
                rows={4}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of the work…"
                className="resize-y border-[#001A3D]/15"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              className="bg-[#FFB84D] text-[#291800] hover:bg-[#ffc266]"
              onClick={() => void submitEntry()}
            >
              {saving ? "Submitting…" : canApprove ? "Save & pay" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
