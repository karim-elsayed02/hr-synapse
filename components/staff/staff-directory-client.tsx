"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Download,
  Filter,
  MapPin,
  MoreHorizontal,
  UserPlus,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAFF_PROFILE_ROLES } from "@/lib/utils/permissions";
import type { StaffRow } from "@/app/(main)/staff/page";

type Props = {
  initialStaff: StaffRow[];
  currentUserRole: string;
  canManageStaff: boolean;
};

type CreateStaffPayload = {
  full_name: string;
  email: string;
  role: string;
  branch?: string;
  department?: string;
  phone?: string;
  emergency_contact?: string;
};

type UpdateStaffPayload = {
  id: string;
  full_name: string;
  role: string;
  branch?: string;
  department?: string;
  phone?: string;
  emergency_contact?: string;
};

const PAGE_SIZE = 8;

function initials(name: string | null) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function syntheticStaffId(uuid: string) {
  const hex = uuid.replace(/-/g, "");
  const n = parseInt(hex.slice(0, 8), 16) % 9000;
  return `SYN-${(8000 + n).toString().padStart(4, "0")}`;
}

function roleBadgeClass(role: string | null) {
  const r = role ?? "staff";
  if (r === "admin")
    return "border border-[#001A3D]/25 bg-[#001A3D]/8 text-[#001A3D]";
  if (r === "branch_lead")
    return "border border-sky-200 bg-sky-50 text-sky-800";
  if (r === "sub_branch_lead")
    return "border border-violet-200 bg-violet-50 text-violet-900";
  return "border border-sky-100 bg-sky-100/80 text-sky-900";
}

function roleLabel(role: string | null) {
  const r = role ?? "staff";
  if (r === "admin") return "ADMIN";
  if (r === "branch_lead") return "BRANCH LEAD";
  if (r === "sub_branch_lead") return "SUB BRANCH LEAD";
  return "STAFF";
}

function exportStaffCsv(rows: StaffRow[]) {
  const headers = [
    "Full name",
    "Email",
    "Role",
    "Branch",
    "Department",
    "Phone",
    "ID",
  ];
  const escape = (v: string | null | undefined) => {
    const s = (v ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map((p) =>
      [
        escape(p.full_name),
        escape(p.email),
        escape(p.role),
        escape(p.branch),
        escape(p.department),
        escape(p.phone),
        escape(p.id),
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `synapse-staff-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PASSWORD_ALPHABET =
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@%^*";

function generateStaffPassword(length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < length; i++) {
    s += PASSWORD_ALPHABET[bytes[i]! % PASSWORD_ALPHABET.length];
  }
  return s;
}

export default function StaffDirectoryClient({
  initialStaff,
  currentUserRole,
  canManageStaff,
}: Props) {
  const [staff, setStaff] = useState<StaffRow[]>(initialStaff);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addStaffForm, setAddStaffForm] = useState<CreateStaffPayload>({
    full_name: "",
    email: "",
    role: "staff",
    branch: "",
    department: "",
    phone: "",
    emergency_contact: "",
  });
  const [addStaffMode, setAddStaffMode] = useState<"invite" | "password">("invite");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [addStaffSuccess, setAddStaffSuccess] = useState<
    | { kind: "invite"; email: string }
    | { kind: "password"; email: string; password: string }
    | null
  >(null);
  const [addStaffError, setAddStaffError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<UpdateStaffPayload>({
    id: "",
    full_name: "",
    role: "staff",
    branch: "",
    department: "",
    phone: "",
    emergency_contact: "",
  });

  const uniqueBranches = useMemo(() => {
    const s = new Set<string>();
    for (const p of staff) {
      if (p.branch?.trim()) s.add(p.branch.trim());
    }
    return Array.from(s).sort();
  }, [staff]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((person) => {
      const synId = syntheticStaffId(person.id).toLowerCase();
      const matchesQuery =
        !q ||
        (person.full_name ?? "").toLowerCase().includes(q) ||
        (person.email ?? "").toLowerCase().includes(q) ||
        (person.role ?? "").toLowerCase().includes(q) ||
        (person.branch ?? "").toLowerCase().includes(q) ||
        (person.department ?? "").toLowerCase().includes(q) ||
        person.id.toLowerCase().includes(q) ||
        synId.includes(q);

      const matchesLocation =
        locationFilter === "all" || (person.branch ?? "").trim() === locationFilter;

      const matchesRole =
        roleFilter === "all" || (person.role ?? "staff") === roleFilter;

      return matchesQuery && matchesLocation && matchesRole;
    });
  }, [staff, query, locationFilter, roleFilter]);

  const totalFiltered = filteredStaff.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedStaff = filteredStaff.slice(pageStart, pageStart + PAGE_SIZE);

  const newHires = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return staff.filter((s) => s.created_at && new Date(s.created_at).getTime() > cutoff).length;
  }, [staff]);

  const onLeaveDisplay = useMemo(() => {
    if (staff.length === 0) return 0;
    return Math.min(staff.length, Math.max(0, Math.round(staff.length * 0.08)));
  }, [staff.length]);

  const activePulsePercent = useMemo(() => {
    if (staff.length === 0) return 0;
    return Math.min(100, Math.max(55, Math.round(((staff.length - onLeaveDisplay) / staff.length) * 100)));
  }, [staff.length, onLeaveDisplay]);

  const branchConcentration = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of staff) {
      const b = (p.branch ?? "Unassigned").trim() || "Unassigned";
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    let top = "";
    let topN = 0;
    for (const [b, n] of counts) {
      if (n > topN) {
        top = b;
        topN = n;
      }
    }
    const pct = staff.length ? Math.round((topN / staff.length) * 100) : 0;
    return { branch: top || "—", percent: pct };
  }, [staff]);

  async function refreshStaff() {
    const res = await fetch("/api/staff", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh staff");
    const data = await res.json();
    setStaff(data);
  }

  function resetAddStaffModal() {
    setAddStaffMode("invite");
    setAddStaffForm({
      full_name: "",
      email: "",
      role: "staff",
      branch: "",
      department: "",
      phone: "",
      emergency_contact: "",
    });
    setGeneratedPassword(generateStaffPassword());
    setAddStaffSuccess(null);
    setAddStaffError(null);
  }

  async function handleAddStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAddStaffError(null);
    const email = addStaffForm.email.trim();
    try {
      if (addStaffMode === "invite") {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addStaffForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send invite");
        await refreshStaff();
        setAddStaffSuccess({ kind: "invite", email });
      } else {
        const res = await fetch("/api/staff", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...addStaffForm,
            password: generatedPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create staff");
        await refreshStaff();
        setAddStaffSuccess({
          kind: "password",
          email,
          password: generatedPassword,
        });
      }
    } catch (error) {
      console.error(error);
      setAddStaffError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function startEdit(person: StaffRow) {
    setEditingId(person.id);
    setEditForm({
      id: person.id,
      full_name: person.full_name ?? "",
      role: person.role ?? "staff",
      branch: person.branch ?? "",
      department: person.department ?? "",
      phone: person.phone ?? "",
      emergency_contact: person.emergency_contact ?? "",
    });
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff");
      await refreshStaff();
      setEditingId(null);
      alert("Staff member updated.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update staff");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStaff(id: string, name: string | null) {
    const confirmed = window.confirm(
      `Delete ${name || "this staff member"}? This will also remove their auth user.`
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete staff");
      setStaff((prev) => prev.filter((person) => person.id !== id));
      alert("Staff member deleted.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to delete staff");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Dialog
        open={addStaffOpen}
        onOpenChange={(open) => {
          setAddStaffOpen(open);
          if (open) resetAddStaffModal();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[520px] overflow-y-auto rounded-2xl border-[#001A3D]/10 bg-white text-[#001A3D]">
          {addStaffSuccess ? (
            <>
              {addStaffSuccess.kind === "invite" ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">Invite sent</DialogTitle>
                    <DialogDescription className="text-[#001A3D]/60">
                      Supabase emailed{" "}
                      <span className="font-medium text-[#001A3D]/80">{addStaffSuccess.email}</span>{" "}
                      a link to accept the invite and set their password.
                    </DialogDescription>
                  </DialogHeader>
                  <p className="rounded-xl border border-[#001A3D]/10 bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D]/75">
                    Ask them to check spam if nothing arrives. Their profile is already created in the
                    directory; they can sign in after completing the link.
                  </p>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">Staff member created</DialogTitle>
                    <DialogDescription className="text-[#001A3D]/60">
                      Account login:{" "}
                      <span className="font-medium text-[#001A3D]/80">{addStaffSuccess.email}</span>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 rounded-xl border border-[#001A3D]/10 bg-[#f8f9fa] p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#001A3D]/45">
                      Temporary password
                    </p>
                    <code className="block break-all rounded-lg bg-white px-3 py-2 text-sm font-mono text-[#001A3D]">
                      {addStaffSuccess.password}
                    </code>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-[#001A3D]/15"
                        onClick={() => {
                          void navigator.clipboard.writeText(addStaffSuccess.password);
                        }}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy password
                      </Button>
                    </div>
                  </div>
                  <p className="rounded-xl border border-[#FFB84D]/35 bg-[#FFB84D]/10 px-4 py-3 text-sm text-[#291800]/90">
                    <span className="font-semibold text-[#001A3D]">Tip:</span> Send this password to{" "}
                    {addStaffSuccess.email} through a channel you trust (e.g. in person, phone, or your
                    company chat). Ask them to sign in and change it under Settings or Profile.
                  </p>
                </>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  className="rounded-full bg-[#001A3D] text-white hover:bg-[#011b3e]"
                  onClick={() => {
                    setAddStaffOpen(false);
                    resetAddStaffModal();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleAddStaffSubmit}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add staff member</DialogTitle>
                <DialogDescription className="text-[#001A3D]/60">
                  {addStaffMode === "invite"
                    ? "Supabase sends an invite email with a link to set their password."
                    : "Create the account now with a temporary password you share yourself."}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-3 flex rounded-xl border border-[#001A3D]/12 bg-[#f8f9fa] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAddStaffMode("invite");
                    setAddStaffError(null);
                  }}
                  className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
                    addStaffMode === "invite"
                      ? "bg-white text-[#001A3D] shadow-sm"
                      : "text-[#001A3D]/50 hover:text-[#001A3D]/80"
                  }`}
                >
                  Email invite
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddStaffMode("password");
                    setAddStaffError(null);
                    setGeneratedPassword((p) => p || generateStaffPassword());
                  }}
                  className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition ${
                    addStaffMode === "password"
                      ? "bg-white text-[#001A3D] shadow-sm"
                      : "text-[#001A3D]/50 hover:text-[#001A3D]/80"
                  }`}
                >
                  Temporary password
                </button>
              </div>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="add-full-name">Full name</Label>
                  <Input
                    id="add-full-name"
                    value={addStaffForm.full_name}
                    onChange={(e) =>
                      setAddStaffForm((p) => ({ ...p, full_name: e.target.value }))
                    }
                    required
                    className="rounded-xl border-[#001A3D]/15"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-email">Work email</Label>
                  <Input
                    id="add-email"
                    type="email"
                    value={addStaffForm.email}
                    onChange={(e) =>
                      setAddStaffForm((p) => ({ ...p, email: e.target.value }))
                    }
                    required
                    className="rounded-xl border-[#001A3D]/15"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-role">Role</Label>
                  <select
                    id="add-role"
                    value={addStaffForm.role}
                    onChange={(e) =>
                      setAddStaffForm((p) => ({ ...p, role: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-[#001A3D]/15 bg-white px-3 text-sm"
                    disabled={loading}
                  >
                    {STAFF_PROFILE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="add-branch">Branch</Label>
                    <Input
                      id="add-branch"
                      value={addStaffForm.branch ?? ""}
                      onChange={(e) =>
                        setAddStaffForm((p) => ({ ...p, branch: e.target.value }))
                      }
                      className="rounded-xl border-[#001A3D]/15"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-dept">Department</Label>
                    <Input
                      id="add-dept"
                      value={addStaffForm.department ?? ""}
                      onChange={(e) =>
                        setAddStaffForm((p) => ({ ...p, department: e.target.value }))
                      }
                      className="rounded-xl border-[#001A3D]/15"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-phone">Phone</Label>
                  <Input
                    id="add-phone"
                    type="tel"
                    value={addStaffForm.phone ?? ""}
                    onChange={(e) =>
                      setAddStaffForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="rounded-xl border-[#001A3D]/15"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-emergency">Emergency contact</Label>
                  <Input
                    id="add-emergency"
                    value={addStaffForm.emergency_contact ?? ""}
                    onChange={(e) =>
                      setAddStaffForm((p) => ({ ...p, emergency_contact: e.target.value }))
                    }
                    className="rounded-xl border-[#001A3D]/15"
                    disabled={loading}
                  />
                </div>
                {addStaffMode === "password" ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor="add-password">Temporary password</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full text-xs text-[#001A3D]/70"
                        disabled={loading}
                        onClick={() => setGeneratedPassword(generateStaffPassword())}
                      >
                        Regenerate
                      </Button>
                    </div>
                    <Input
                      id="add-password"
                      readOnly
                      value={generatedPassword}
                      className="rounded-xl border-[#001A3D]/15 bg-[#f8f9fa] font-mono text-sm"
                    />
                  </div>
                ) : null}
                {addStaffError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                    {addStaffError}
                  </p>
                ) : null}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#001A3D]/20"
                  disabled={loading}
                  onClick={() => setAddStaffOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full bg-[#FFB84D] font-semibold text-[#291800] hover:bg-[#f5a84a]"
                  disabled={
                    loading ||
                    (addStaffMode === "password" && !generatedPassword)
                  }
                >
                  {loading
                    ? addStaffMode === "invite"
                      ? "Sending…"
                      : "Creating…"
                    : addStaffMode === "invite"
                      ? "Send invite"
                      : "Create account"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Page header — Digital Curator */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#001A3D]/45">
            Directory <span className="text-[#001A3D]/30">›</span> Active personnel
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[#001A3D] sm:text-4xl">
            Staff Directory
          </h1>
          <p className="mt-2 text-sm text-[#001A3D]/55">
            Workforce management <span className="text-[#001A3D]/35">•</span>{" "}
            <span className="font-medium text-[#001A3D]/70">{staff.length}</span> total members
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => exportStaffCsv(filteredStaff)}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--curator-radius-xl)] border border-[#001A3D]/15 bg-white px-5 text-sm font-semibold text-[#001A3D] shadow-[var(--curator-shadow)] transition hover:bg-[#f8f9fa]"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            Export CSV
          </button>
          {canManageStaff ? (
            <button
              type="button"
              onClick={() => {
                resetAddStaffModal();
                setAddStaffOpen(true);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--curator-radius-xl)] bg-[#FFB84D] px-5 text-sm font-semibold text-[#291800] shadow-[var(--curator-shadow)] transition hover:bg-[#f5a84a]"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2} />
              Add staff
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Filters */}
          <div className="curator-card p-6 shadow-[var(--curator-shadow)]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="relative md:col-span-1">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/35" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name, role, or ID..."
                  className="h-12 w-full rounded-2xl bg-[#f3f4f5] pl-11 pr-4 text-sm text-[#001A3D] outline-none ring-0 transition placeholder:text-[#001A3D]/40 focus:bg-white focus:shadow-[0_0_0_2px_rgba(255,184,77,0.35)]"
                />
              </div>
              <Select
                value={locationFilter}
                onValueChange={(v) => {
                  setLocationFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-12 rounded-2xl border-0 bg-[#f3f4f5] text-[#001A3D] shadow-none focus:ring-2 focus:ring-[#FFB84D]/40">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {uniqueBranches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-12 rounded-2xl border-0 bg-[#f3f4f5] text-[#001A3D] shadow-none focus:ring-2 focus:ring-[#FFB84D]/40">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {STAFF_PROFILE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="curator-card overflow-hidden shadow-[var(--curator-shadow)]">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full border-collapse">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#001A3D]/45">
                    <th className="px-6 py-4">Staff member</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4">Branch</th>
                    <th className="min-w-[180px] px-4 py-4">Contact details</th>
                    {canManageStaff ? <th className="w-12 px-4 py-4" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {paginatedStaff.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManageStaff ? 5 : 4}
                        className="px-6 py-16 text-center text-sm text-[#001A3D]/50"
                      >
                        No staff match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedStaff.map((person) => {
                      const isEditing = editingId === person.id;
                      const syn = syntheticStaffId(person.id);

                      return (
                        <tr
                          key={person.id}
                          className="transition-colors hover:bg-[#f8f9fa]/90"
                        >
                          <td className="px-6 py-4 align-middle">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.full_name}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    full_name: e.target.value,
                                  }))
                                }
                                className="h-10 w-full max-w-[220px] rounded-xl bg-[#f3f4f5] px-3 text-sm"
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                                  <AvatarFallback className="bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-xs font-semibold text-[#FFB84D]">
                                    {initials(person.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <Link
                                    href={`/staff/${person.id}`}
                                    className="font-semibold text-[#001A3D] hover:text-[#FFB84D] hover:underline"
                                  >
                                    {person.full_name?.trim() || "Unnamed user"}
                                  </Link>
                                  <p className="text-xs text-[#001A3D]/45">ID: {syn}</p>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            {isEditing ? (
                              <select
                                value={editForm.role}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, role: e.target.value }))
                                }
                                className="h-10 rounded-xl border-0 bg-[#f3f4f5] px-2 text-sm"
                              >
                                {STAFF_PROFILE_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(person.role)}`}
                              >
                                {roleLabel(person.role)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.branch ?? ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, branch: e.target.value }))
                                }
                                className="h-10 w-full min-w-[100px] rounded-xl bg-[#f3f4f5] px-3 text-sm"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-[#001A3D]/80">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#4DB8FF]" />
                                {person.branch?.trim() || "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-middle text-sm">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={editForm.phone ?? ""}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                                  }
                                  placeholder="Phone"
                                  className="h-9 rounded-lg bg-[#f3f4f5] px-2 text-xs"
                                />
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <p className="truncate text-[#001A3D]/85">{person.email || "—"}</p>
                                <p className="text-xs text-[#001A3D]/50">{person.phone || "—"}</p>
                              </div>
                            )}
                          </td>
                          {canManageStaff ? (
                            <td className="px-4 py-4 align-middle text-right">
                              {isEditing ? (
                                <form
                                  onSubmit={handleUpdateStaff}
                                  className="flex justify-end gap-2"
                                >
                                  <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-full bg-[#001A3D] px-3 py-1.5 text-xs font-semibold text-white"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="rounded-full px-3 py-1.5 text-xs font-medium text-[#001A3D]/70 hover:bg-[#f3f4f5]"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 rounded-full text-[#001A3D]/50 hover:bg-[#f3f4f5] hover:text-[#001A3D]"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-2xl">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/staff/${person.id}`}>View profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => startEdit(person)}>
                                      Quick edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() =>
                                        handleDeleteStaff(person.id, person.full_name)
                                      }
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

            {totalFiltered > 0 ? (
              <div className="flex flex-col gap-4 border-t border-[#001A3D]/[0.06] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#001A3D]/50">
                  Showing{" "}
                  <span className="font-medium text-[#001A3D]/70">
                    {pageStart + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-[#001A3D]/70">
                    {Math.min(pageStart + PAGE_SIZE, totalFiltered)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-[#001A3D]/70">{totalFiltered}</span>{" "}
                  entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-[#001A3D] transition hover:bg-[#f3f4f5] disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-[#001A3D]/45">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-full bg-[#FFB84D] px-4 py-1.5 text-sm font-semibold text-[#291800] transition hover:bg-[#f5a84a] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <p className="text-center text-xs text-[#001A3D]/40">
            Your role: <span className="font-medium text-[#001A3D]/60">{currentUserRole}</span>
          </p>
        </div>

        {/* Right column widgets */}
        <aside className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#001A3D] to-[#011b3e] p-6 text-white shadow-[var(--curator-shadow)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FFB84D]/90">
              Workforce pulse
            </p>
            <div className="mt-4 flex items-end justify-between gap-2">
              <div>
                <p className="text-xs text-white/60">Active now</p>
                <p className="font-display text-3xl font-semibold text-white">{activePulsePercent}%</p>
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4DB8FF] to-teal-400 transition-[width]"
                style={{ width: `${activePulsePercent}%` }}
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-black/20 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  On leave
                </p>
                <p className="mt-1 font-display text-xl font-semibold text-white">{onLeaveDisplay}</p>
              </div>
              <div className="rounded-xl bg-black/20 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  New hires
                </p>
                <p className="mt-1 font-display text-xl font-semibold text-white">
                  {String(newHires).padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>

          <div className="curator-card overflow-hidden p-0 shadow-[var(--curator-shadow)]">
            <div className="relative h-36 bg-gradient-to-br from-[#e8eaed] via-[#f3f4f5] to-[#d4d7dc]">
              <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_30%_40%,#001a3d22_0%,transparent_50%)]" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-[#001A3D] shadow-sm backdrop-blur-sm">
                <MapPin className="h-4 w-4 text-red-500" />
                {branchConcentration.branch !== "—"
                  ? `${branchConcentration.branch} hub`
                  : "Branch map"}
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm leading-relaxed text-[#001A3D]/75">
                Branch concentration:{" "}
                <span className="font-semibold text-[#001A3D]">
                  {branchConcentration.branch}
                </span>{" "}
                holds{" "}
                <span className="font-semibold text-[#001A3D]">{branchConcentration.percent}%</span>{" "}
                of staff.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
