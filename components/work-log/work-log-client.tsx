"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import type { WorkLogRow, WorkLogStaffOption } from "@/lib/types/staff-work-log";

function one<T>(ref: T | T[] | null | undefined): T | null {
  if (ref == null) return null;
  return Array.isArray(ref) ? ref[0] ?? null : ref;
}

type WorkLogClientProps = {
  initialLogs: WorkLogRow[];
  staffOptions: WorkLogStaffOption[];
  currentUserId: string;
  filterFrom: string;
  filterTo: string;
  filterStaffId: string;
  loadError: string | null;
};

export function WorkLogClient({
  initialLogs,
  staffOptions,
  currentUserId,
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
    const supabase = createClient();
    const { error } = await supabase.from("staff_work_logs").insert({
      staff_profile_id: currentUserId,
      logged_by_id: currentUserId,
      work_date: formDate,
      hours_worked: hours,
      description: desc,
    });
    setSaving(false);

    if (error) {
      toast({
        title: "Could not save entry",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Entry saved" });
    setAddOpen(false);
    resetAddForm();
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
            Log your own hours and what you did. Admins and branch leads can review entries; branch leads
            only see people in their branch.
          </p>
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
          Add entry
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load entries ({loadError}). If this is the first setup, run{" "}
          <code className="rounded bg-white/80 px-1">scripts/26_staff_work_logs.sql</code> in Supabase.
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
          <Button
            type="button"
            variant="secondary"
            className="border border-[#001A3D]/12 bg-[#001A3D]/5 text-[#001A3D] hover:bg-[#001A3D]/10"
            onClick={applyUrlFilters}
          >
            Apply date & staff
          </Button>
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
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--curator-radius-xl)] border border-[#001A3D]/8 bg-white shadow-[var(--curator-shadow)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[#001A3D]/10 bg-[#f8f9fa] text-xs font-semibold uppercase tracking-wide text-[#001A3D]/55">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001A3D]/8">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[#001A3D]/50">
                    No entries in this range. Try widening the dates or click Add entry.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const s = one(row.staff);
                  return (
                    <tr key={row.id} className="align-top text-[#001A3D]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#001A3D]/85">{row.work_date}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s?.full_name ?? "—"}</div>
                        <div className="text-xs text-[#001A3D]/50">{s?.email ?? ""}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                        {Number(row.hours_worked).toFixed(2)}
                      </td>
                      <td className="max-w-md px-4 py-3 text-[#001A3D]/85">{row.description}</td>
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
            <DialogTitle className="text-[#001A3D]">Add work log entry</DialogTitle>
            <DialogDescription>
              This entry is for you: the date you worked, how many hours, and a short description of what
              you did.
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
              {saving ? "Saving…" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
