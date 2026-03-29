"use client";

import { useMemo, useState } from "react";
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

function formatRole(role: string | null) {
  if (!role) return "Staff";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB");
}

export default function StaffDirectoryClient({
  initialStaff,
  currentUserRole,
  canManageStaff,
}: Props) {
  const [staff, setStaff] = useState<StaffRow[]>(initialStaff);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateStaffPayload>({
    full_name: "",
    email: "",
    role: "staff",
    branch: "",
    department: "",
    phone: "",
    emergency_contact: "",
  });

  const [editForm, setEditForm] = useState<UpdateStaffPayload>({
    id: "",
    full_name: "",
    role: "staff",
    branch: "",
    department: "",
    phone: "",
    emergency_contact: "",
  });

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;

    return staff.filter((person) => {
      return (
        (person.full_name ?? "").toLowerCase().includes(q) ||
        (person.email ?? "").toLowerCase().includes(q) ||
        (person.role ?? "").toLowerCase().includes(q) ||
        (person.branch ?? "").toLowerCase().includes(q) ||
        (person.department ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, staff]);

  async function refreshStaff() {
    const res = await fetch("/api/staff", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to refresh staff");
    }
    const data = await res.json();
    setStaff(data);
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add staff");
      }

      await refreshStaff();

      setCreateForm({
        full_name: "",
        email: "",
        role: "staff",
        branch: "",
        department: "",
        phone: "",
        emergency_contact: "",
      });

      alert("Staff member invited successfully.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to add staff");
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

      if (!res.ok) {
        throw new Error(data.error || "Failed to update staff");
      }

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

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete staff");
      }

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Staff Directory</h1>
          <p className="mt-1 text-sm text-slate-600">
            View all SynapseUK team members.
          </p>
        </div>

        <div className="w-full max-w-md">
          <label htmlFor="staff-search" className="mb-2 block text-sm font-medium text-slate-700">
            Search staff
          </label>
          <input
            id="staff-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, role, branch..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>
      </div>

      {canManageStaff ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Add staff member</h2>
            <p className="mt-1 text-sm text-slate-500">
              This sends an invite email and creates their profile.
            </p>
          </div>

          <form onSubmit={handleCreateStaff} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              placeholder="Full name"
              value={createForm.full_name}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm"
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm"
              required
            />

            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>

            <input
              type="text"
              placeholder="Branch"
              value={createForm.branch}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, branch: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm"
            />

            <input
              type="text"
              placeholder="Department"
              value={createForm.department}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, department: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm"
            />

            <input
              type="text"
              placeholder="Phone"
              value={createForm.phone}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm"
            />

            <input
              type="text"
              placeholder="Emergency contact"
              value={createForm.emergency_contact}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  emergency_contact: e.target.value,
                }))
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm"
            />

            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Invite staff"}
            </button>
          </form>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Team members</h2>
            <p className="text-sm text-slate-500">
              {filteredStaff.length} result{filteredStaff.length === 1 ? "" : "s"}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Your role: {formatRole(currentUserRole)}
          </span>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h3 className="text-base font-medium text-slate-900">No staff found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Branch</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  {canManageStaff ? <th className="px-5 py-3 font-medium">Actions</th> : null}
                </tr>
              </thead>

              <tbody>
                {filteredStaff.map((person) => {
                  const isEditing = editingId === person.id;

                  return (
                    <tr
                      key={person.id}
                      className="border-b border-slate-100 align-top text-sm hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-slate-900">
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
                            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        ) : (
                          <span className="font-medium">
                            {person.full_name?.trim() || "Unnamed user"}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">{person.email || "—"}</td>

                      <td className="px-5 py-4">
                        {isEditing ? (
                          <select
                            value={editForm.role}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, role: e.target.value }))
                            }
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {formatRole(person.role)}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.branch ?? ""}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, branch: e.target.value }))
                            }
                            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        ) : (
                          person.branch || "—"
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.department ?? ""}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                department: e.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                          />
                        ) : (
                          person.department || "—"
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(person.created_at)}
                      </td>

                      {canManageStaff ? (
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <form onSubmit={handleUpdateStaff} className="flex flex-wrap gap-2">
                              <button
                                type="submit"
                                disabled={loading}
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(person)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteStaff(person.id, person.full_name)
                                }
                                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
