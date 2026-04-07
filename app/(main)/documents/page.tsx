"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
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
import {
  FileText,
  Upload,
  Download,
  Trash2,
  CalendarDays,
  Loader2,
  Search,
} from "lucide-react";

type DocumentRow = {
  id: number;
  user_id: string;
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
};

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

export default function DocumentsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<{ id: string; full_name: string | null }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("file", selectedFile);

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
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  const filtered = documents.filter((d) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      d.document_title.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q) ||
      (d.file_name ?? "").toLowerCase().includes(q)
    );
  });

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
            {isAdmin ? "Manage employee documents" : "Your uploaded documents"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2 rounded-full bg-[#FFB84D] px-5 py-2.5 font-semibold text-[#291800] shadow-md hover:bg-[#f5a84a]"
          >
            <Upload className="h-4 w-4" />
            Upload document
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
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#001A3D]/[0.06] text-[10px] font-semibold uppercase tracking-wider text-[#001A3D]/50">
                <th className="px-6 py-4">Document</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Size</th>
                <th className="px-4 py-4">Uploaded</th>
                <th className="px-4 py-4">Expiry</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001A3D]/[0.04]">
              {filtered.map((doc) => (
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
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600"
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
      )}

      {/* Upload dialog (admin only) */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
          <DialogHeader className="px-6 pt-6 pb-0">
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

            <fieldset disabled={uploading} className="space-y-4">
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

              <div>
                <Label htmlFor="doc-title">Document title</Label>
                <Input
                  id="doc-title"
                  name="document_title"
                  required
                  placeholder="e.g. DBS Certificate"
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
