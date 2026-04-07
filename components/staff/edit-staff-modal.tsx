"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAFF_PROFILE_ROLES } from "@/lib/utils/permissions";
import {
  BRANCH_SLUGS,
  SUB_BRANCH_SLUGS,
  BRANCH_LABELS,
  SUB_BRANCH_LABELS,
  normalizeBranchSlug,
  normalizeSubBranchSlug,
} from "@/lib/utils/org-structure";
import type { StaffRow } from "@/app/(main)/staff/page";

type UpdateStaffPayload = {
  id: string;
  full_name: string;
  role: string;
  branch?: string;
  department?: string;
  phone?: string;
  emergency_contact?: string;
  hourly_rate?: string;
};

const emptyForm = (): UpdateStaffPayload => ({
  id: "",
  full_name: "",
  role: "staff",
  branch: "",
  department: "",
  phone: "",
  emergency_contact: "",
  hourly_rate: "",
});

function staffToForm(person: StaffRow): UpdateStaffPayload {
  const hr = person.hourly_rate;
  return {
    id: person.id,
    full_name: person.full_name ?? "",
    role: person.role ?? "staff",
    branch: normalizeBranchSlug(person.branch) ?? "",
    department: normalizeSubBranchSlug(person.department) ?? "",
    phone: person.phone ?? "",
    emergency_contact: person.emergency_contact ?? "",
    hourly_rate:
      hr != null && !Number.isNaN(Number(hr)) ? String(Number(hr)) : "",
  };
}

type Props = {
  staff: StaffRow | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
};

export function EditStaffModal({ staff, onClose, onSaved }: Props) {
  const open = staff !== null;
  const [form, setForm] = useState<UpdateStaffPayload>(emptyForm);
  const [emailDisplay, setEmailDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staff) {
      setForm(emptyForm());
      setEmailDisplay("");
      setError(null);
      return;
    }
    setForm(staffToForm(staff));
    setEmailDisplay(staff.email ?? "");
    setError(null);
  }, [staff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.branch?.trim()) {
      setError("Please select a branch.");
      return;
    }
    if (form.branch !== "tutoring" && !form.department?.trim()) {
      setError("Please select a sub-branch.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff");
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-[520px] overflow-y-auto rounded-2xl border-[#001A3D]/10 bg-white text-[#001A3D]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit staff member</DialogTitle>
            <DialogDescription className="text-[#001A3D]/60">
              Update directory details. Email is managed in Supabase Auth and cannot be changed here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Full name</Label>
              <Input
                id="edit-full-name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, full_name: e.target.value }))
                }
                required
                className="rounded-xl border-[#001A3D]/15"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Work email</Label>
              <Input
                id="edit-email"
                type="email"
                value={emailDisplay}
                readOnly
                className="rounded-xl border-[#001A3D]/15 bg-[#f8f9fa] text-[#001A3D]/70"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <select
                id="edit-role"
                value={form.role}
                onChange={(e) =>
                  setForm((p) => ({ ...p, role: e.target.value }))
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
                <Label htmlFor="edit-branch">Branch</Label>
                <select
                  id="edit-branch"
                  required
                  value={form.branch ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, branch: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-[#001A3D]/15 bg-white px-3 text-sm"
                  disabled={loading}
                >
                  <option value="">Select branch…</option>
                  {BRANCH_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {BRANCH_LABELS[slug]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dept">
                  Sub-branch
                  {form.branch === "tutoring" ? (
                    <span className="ml-1 font-normal text-[#001A3D]/45">
                      (optional)
                    </span>
                  ) : null}
                </Label>
                <select
                  id="edit-dept"
                  required={form.branch !== "tutoring"}
                  value={form.department ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, department: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-[#001A3D]/15 bg-white px-3 text-sm"
                  disabled={loading}
                >
                  <option value="">Select sub-branch…</option>
                  {SUB_BRANCH_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {SUB_BRANCH_LABELS[slug]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                className="rounded-xl border-[#001A3D]/15"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-emergency">Emergency contact</Label>
              <Input
                id="edit-emergency"
                value={form.emergency_contact ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, emergency_contact: e.target.value }))
                }
                className="rounded-xl border-[#001A3D]/15"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hourly-rate">Hourly rate (GBP)</Label>
              <Input
                id="edit-hourly-rate"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="e.g. 12.50"
                value={form.hourly_rate ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, hourly_rate: e.target.value }))
                }
                className="rounded-xl border-[#001A3D]/15"
                disabled={loading}
              />
              <p className="text-xs text-[#001A3D]/45">Optional. Leave blank to clear.</p>
            </div>
            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#001A3D]/20"
              disabled={loading}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-[#FFB84D] font-semibold text-[#291800] hover:bg-[#f5a84a]"
              disabled={loading}
            >
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
