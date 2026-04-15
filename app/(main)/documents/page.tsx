"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { canDeleteBranchDocument } from "@/lib/utils/branch-document-access";
import { normalizeBranchSlug, normalizeSubBranchSlug } from "@/lib/utils/org-structure";
import type { ProfileSlice } from "@/lib/utils/branch-document-access";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  User,
} from "lucide-react";

type BranchRel = { id: string; name: string } | { id: string; name: string }[] | null | undefined;
type SubRel = { id: string; name: string } | { id: string; name: string }[] | null | undefined;

type DocumentRow = {
  id: number;
  user_id: string;
  scope?: string | null;
  branch_id?: string | null;
  sub_branch_id?: string | null;
  document_title: string;
  document_type: string;
  description: string | null;
  expiry_date: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
  download_url: string | null;
  branch?: BranchRel;
  sub_branch?: SubRel;
};

function rel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

const DOCUMENT_TYPES = [
  "DBS Certificate",
  "Contract",
  "Training Certificate",
  "Policy Document",
  "ID Document",
  "Other",
];

function folderLabel(doc: DocumentRow): string {
  const scope = doc.scope ?? "employee";
  if (scope !== "branch") return "Personal (HR records)";
  const b = rel(doc.branch);
  const s = rel(doc.sub_branch);
  if (!b) return "Branch";
  if (!s) return `${b.name} — whole branch`;
  return `${b.name} / ${s.name}`;
}

function folderSortKey(doc: DocumentRow): string {
  const scope = doc.scope ?? "employee";
  if (scope !== "branch") return "0-personal";
  return `1-${doc.branch_id ?? ""}-${doc.sub_branch_id ?? "all"}`;
}

export default function DocumentsPage() {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<{ id: string; full_name: string | null }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<"employee" | "branch">("employee");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [subBranches, setSubBranches] = useState<{ id: string; name: string }[]>([]);

  const role = profile?.role ?? null;
  const canUploadEmployee = isAdmin;
  const canUploadBranch =
    role === "admin" || role === "branch_lead" || role === "sub_branch_lead";
  const showUpload = canUploadEmployee || canUploadBranch;

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) return;
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchDocuments();
  }, [authLoading, user, router, fetchDocuments]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/staff")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStaffList(data);
      })
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    void Promise.all([
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("sub_branches").select("id, name").order("name"),
    ]).then(([br, sub]) => {
      if (!br.error && br.data) setBranches(br.data as { id: string; name: string }[]);
      if (!sub.error && sub.data) setSubBranches(sub.data as { id: string; name: string }[]);
    });
  }, [user]);

  useEffect(() => {
    if (!uploadOpen) return;
    if (canUploadEmployee) {
      setUploadKind("employee");
    } else if (canUploadBranch) {
      setUploadKind("branch");
    }
  }, [uploadOpen, canUploadEmployee, canUploadBranch]);

  const defaultBranchId = useMemo(() => {
    if (!profile?.branch || branches.length === 0) return "";
    const m = branches.find(
      (b) => normalizeBranchSlug(b.name) === normalizeBranchSlug(profile.branch)
    );
    return m?.id ?? "";
  }, [profile?.branch, branches]);

  const defaultSubBranchId = useMemo(() => {
    if (!profile?.department || subBranches.length === 0) return "";
    const m = subBranches.find(
      (s) => normalizeSubBranchSlug(s.name) === normalizeSubBranchSlug(profile.department)
    );
    return m?.id ?? "";
  }, [profile?.department, subBranches]);

  const subBranchesForLead = useMemo(() => {
    if (role !== "sub_branch_lead" || !profile?.department) return subBranches;
    const matched = subBranches.filter(
      (s) => normalizeSubBranchSlug(s.name) === normalizeSubBranchSlug(profile.department)
    );
    return matched.length > 0 ? matched : subBranches;
  }, [role, profile?.department, subBranches]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("file", selectedFile);
    if (uploadKind === "branch") {
      fd.set("upload_kind", "branch");
    }

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setUploadOpen(false);
      setSelectedFile(null);
      await fetchDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this document? The file will also be removed.")) return;
    const res = await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  }

  const filtered = documents.filter((d) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      d.document_title.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      (d.file_name ?? "").toLowerCase().includes(q) ||
      folderLabel(d).toLowerCase().includes(q)
    );
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; label: string; docs: DocumentRow[] }>();
    for (const doc of filtered) {
      const key = folderSortKey(doc);
      const label = folderLabel(doc);
      const cur = map.get(key);
      if (cur) cur.docs.push(doc);
      else map.set(key, { key, label, docs: [doc] });
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered]);

  function showDeleteButton(doc: DocumentRow): boolean {
    if (isAdmin) return true;
    const p: ProfileSlice = {
      role: profile?.role ?? null,
      branch: profile?.branch ?? null,
      department: profile?.department ?? null,
    };
    return canDeleteBranchDocument(p, doc as never, user?.id ?? "");
  }

  if (authLoading || loading) {
    return <LoadingSpinner text="Loading documents..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#001A3D] sm:text-3xl">
            Documents
          </h1>
          <p className="mt-1 text-sm text-[#001A3D]/55">
            {isAdmin
              ? "Employee HR files and branch shared libraries"
              : "Documents for you and your branch / sub-branch"}
          </p>
        </div>
        {showUpload && (
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2 rounded-full bg-[#FFB84D] px-5 py-2.5 font-semibold text-[#291800] shadow-md hover:bg-[#f5a84a]"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/40" />
        <Input
          placeholder="Search documents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-xl border-0 bg-white pl-10 shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl bg-white shadow-sm">
          <p className="text-sm text-[#001A3D]/40">
            {documents.length === 0 ? "No documents yet." : "No documents match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((folder) => (
            <Collapsible
              key={folder.key}
              defaultOpen
              className="group overflow-hidden rounded-2xl border border-[#001A3D]/6 bg-white shadow-sm"
            >
              <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8f9fa]">
                <ChevronDown className="h-4 w-4 shrink-0 text-[#001A3D]/45 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                {(folder.docs[0]?.scope ?? "employee") === "branch" ? (
                  <Building2 className="h-5 w-5 shrink-0 text-[#001A3D]/50" />
                ) : (
                  <User className="h-5 w-5 shrink-0 text-[#001A3D]/50" />
                )}
                <span className="font-semibold text-[#001A3D]">{folder.label}</span>
                <span className="text-xs text-[#001A3D]/40">({folder.docs.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="overflow-x-auto border-t border-[#001A3D]/6">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr className="border-b border-[#001A3D]/6 text-[10px] font-semibold uppercase tracking-wider text-[#001A3D]/50">
                        <th className="px-6 py-3">Document</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Uploaded</th>
                        <th className="px-4 py-3">Expiry</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#001A3D]/4">
                      {folder.docs.map((doc) => (
                        <tr key={doc.id} className="transition-colors hover:bg-[#f8f9fa]/90">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFB84D]/15 text-[#b47a1a]">
                                <FileText className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-[#001A3D]">{doc.document_title}</p>
                                {doc.file_name && (
                                  <p className="truncate text-xs text-[#001A3D]/45">{doc.file_name}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-[#001A3D]/70">{doc.document_type}</td>
                          <td className="px-4 py-4 text-sm tabular-nums text-[#001A3D]/60">
                            {formatBytes(doc.file_size)}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#001A3D]/60">
                            {formatDate(doc.created_at) ?? "—"}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {doc.expiry_date ? (
                              <span className="inline-flex items-center gap-1 text-[#001A3D]/60">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDate(doc.expiry_date)}
                              </span>
                            ) : (
                              <span className="text-[#001A3D]/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {doc.download_url && (
                                <a
                                  href={doc.download_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#001A3D]/50 hover:bg-[#f3f4f5] hover:text-[#001A3D]"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              {showDeleteButton(doc) && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(doc.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
          <DialogHeader className="px-6 pb-0 pt-6">
            <DialogTitle className="font-display text-xl font-semibold text-[#001A3D]">
              Upload document
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-5 px-6 pb-6 pt-4">
            {uploadError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200/80">
                {uploadError}
              </p>
            )}

            {canUploadEmployee && canUploadBranch && (
              <div className="flex gap-2 rounded-xl bg-[#f8f9fa] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setUploadKind("employee");
                    setSelectedFile(null);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    uploadKind === "employee"
                      ? "bg-white text-[#001A3D] shadow-sm"
                      : "text-[#001A3D]/55"
                  }`}
                >
                  Employee (HR)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadKind("branch");
                    setSelectedFile(null);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    uploadKind === "branch"
                      ? "bg-white text-[#001A3D] shadow-sm"
                      : "text-[#001A3D]/55"
                  }`}
                >
                  Branch / sub-branch
                </button>
              </div>
            )}

            {canUploadBranch && !canUploadEmployee && (
              <input type="hidden" name="upload_kind" value="branch" />
            )}

            <fieldset disabled={uploading} className="space-y-4">
              {uploadKind === "employee" && canUploadEmployee && (
                <div>
                  <Label htmlFor="doc-user">Staff member</Label>
                  <select
                    id="doc-user"
                    name="user_id"
                    required
                    className="mt-1 h-10 w-full rounded-xl border border-[#001A3D]/15 bg-[#f8f9fa] px-3 text-sm"
                  >
                    <option value="">Select staff…</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(uploadKind === "branch" || (!canUploadEmployee && canUploadBranch)) && (
                <>
                  {canUploadEmployee && uploadKind === "branch" && (
                    <input type="hidden" name="upload_kind" value="branch" />
                  )}
                  <div>
                    <Label htmlFor="doc-branch">Branch</Label>
                    <select
                      id="doc-branch"
                      name="branch_id"
                      required
                      defaultValue={defaultBranchId}
                      className="mt-1 h-10 w-full rounded-xl border border-[#001A3D]/15 bg-[#f8f9fa] px-3 text-sm"
                    >
                      <option value="">Select branch…</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="doc-sub">
                      {role === "sub_branch_lead" ? "Sub-branch" : "Sub-branch (optional)"}
                    </Label>
                    <select
                      id="doc-sub"
                      name="sub_branch_id"
                      required={role === "sub_branch_lead"}
                      defaultValue={role === "sub_branch_lead" ? defaultSubBranchId : ""}
                      className="mt-1 h-10 w-full rounded-xl border border-[#001A3D]/15 bg-[#f8f9fa] px-3 text-sm"
                    >
                      {role !== "sub_branch_lead" && (
                        <option value="">Whole branch (everyone in branch)</option>
                      )}
                      {(role === "sub_branch_lead" ? subBranchesForLead : subBranches).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="doc-title">Document title</Label>
                <Input
                  id="doc-title"
                  name="document_title"
                  required
                  placeholder="e.g. Policy or DBS Certificate"
                  className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                />
              </div>

              <div>
                <Label htmlFor="doc-type">Document type</Label>
                <select
                  id="doc-type"
                  name="document_type"
                  required
                  className="mt-1 h-10 w-full rounded-xl border border-[#001A3D]/15 bg-[#f8f9fa] px-3 text-sm"
                >
                  <option value="">Select type…</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doc-expiry">Expiry date</Label>
                  <Input
                    id="doc-expiry"
                    name="expiry_date"
                    type="date"
                    className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                  />
                </div>
                <div>
                  <Label>File (max 10 MB)</Label>
                  <label className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#001A3D]/20 bg-[#f8f9fa] px-3 text-sm text-[#001A3D]/60 hover:border-[#FFB84D]/50">
                    {selectedFile ? (
                      <span className="truncate">{selectedFile.name}</span>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Choose file
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="doc-desc">Description (optional)</Label>
                <Textarea
                  id="doc-desc"
                  name="description"
                  rows={2}
                  className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                />
              </div>
            </fieldset>

            <Button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full rounded-full bg-[#FFB84D] px-5 py-3 font-semibold text-[#291800] shadow-md hover:bg-[#f5a84a] disabled:opacity-60"
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </span>
              ) : (
                "Upload document"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
