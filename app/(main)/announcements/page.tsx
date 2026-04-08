"use client";

import { useCallback, useEffect, useState } from "react";
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
  Megaphone,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  CalendarDays,
} from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  show_on_login: boolean;
  created_by: string | null;
  created_at: string;
  starts_at: string | null;
  expires_at: string | null;
  image_url: string | null;
  image_alt_text: string | null;
  creator: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
};

function rel<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

export default function AnnouncementsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    const qs = isAdmin ? "?all=true" : "";
    const res = await fetch(`/api/announcements${qs}`);
    if (res.ok) setAnnouncements(await res.json());
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    fetchAnnouncements();
  }, [authLoading, user, router, fetchAnnouncements]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (selectedImage) fd.set("image", selectedImage);
    fd.set("show_on_login", fd.get("show_on_login") ? "true" : "false");

    try {
      const res = await fetch("/api/announcements", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setCreateOpen(false);
      setSelectedImage(null);
      await fetchAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, currently: boolean) {
    await fetch("/api/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !currently }),
    });
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !currently } : a)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement permanently?")) return;
    await fetch("/api/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  if (authLoading || loading) {
    return <LoadingSpinner text="Loading announcements…" className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#001A3D] sm:text-3xl">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-[#001A3D]/55">Company news and updates</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-full bg-[#FFB84D] px-5 py-2.5 font-semibold text-[#291800] shadow-md hover:bg-[#f5a84a]"
          >
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl bg-white shadow-sm">
          <p className="text-sm text-[#001A3D]/40">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const creator = rel(a.creator);
            return (
              <div
                key={a.id}
                className={`relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition ${!a.is_active ? "opacity-50" : ""}`}
              >
                {a.image_url && (
                  <img
                    src={a.image_url}
                    alt={a.image_alt_text || ""}
                    className="mb-4 h-48 w-full rounded-xl object-cover"
                  />
                )}
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB84D]/15 text-[#b47a1a]">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-[#001A3D]">{a.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#001A3D]/65">
                      {a.content}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#001A3D]/45">
                      {creator?.full_name && <span>By {creator.full_name}</span>}
                      <span>{fmtDate(a.created_at)}</span>
                      {a.show_on_login && (
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-sky-700">Shown on login</span>
                      )}
                      {a.expires_at && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> Expires {fmtDate(a.expires_at)}
                        </span>
                      )}
                      {!a.is_active && (
                        <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-600">Inactive</span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(a.id, a.is_active)}
                        title={a.is_active ? "Deactivate" : "Activate"}
                        className="rounded-lg p-2 text-[#001A3D]/40 hover:bg-[#f3f4f5] hover:text-[#001A3D]"
                      >
                        {a.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="font-display text-xl font-semibold text-[#001A3D]">
              New announcement
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-5 px-6 pb-6 pt-4">
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200/80">
                {error}
              </p>
            )}

            <fieldset disabled={submitting} className="space-y-4">
              <div>
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  name="title"
                  required
                  placeholder="Announcement title"
                  className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                />
              </div>

              <div>
                <Label htmlFor="ann-content">Content</Label>
                <Textarea
                  id="ann-content"
                  name="content"
                  required
                  rows={4}
                  placeholder="Write your announcement…"
                  className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ann-starts">Starts at (optional)</Label>
                  <Input
                    id="ann-starts"
                    name="starts_at"
                    type="datetime-local"
                    className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                  />
                </div>
                <div>
                  <Label htmlFor="ann-expires">Expires at (optional)</Label>
                  <Input
                    id="ann-expires"
                    name="expires_at"
                    type="datetime-local"
                    className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ann-login"
                  name="show_on_login"
                  defaultChecked
                  className="h-4 w-4 rounded border-[#001A3D]/20 text-[#FFB84D] focus:ring-[#FFB84D]/40"
                />
                <Label htmlFor="ann-login" className="text-sm">
                  Show as full-page overlay on login
                </Label>
              </div>

              <div>
                <Label>Image (optional, max 5 MB)</Label>
                <label className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#001A3D]/20 bg-[#f8f9fa] px-3 text-sm text-[#001A3D]/60 hover:border-[#FFB84D]/50">
                  {selectedImage ? (
                    <span className="truncate">{selectedImage.name}</span>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4" /> Choose image
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <Label htmlFor="ann-alt">Image alt text (optional)</Label>
                <Input
                  id="ann-alt"
                  name="image_alt_text"
                  placeholder="Describe the image"
                  className="mt-1 rounded-xl border-[#001A3D]/15 bg-[#f8f9fa]"
                />
              </div>
            </fieldset>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#FFB84D] px-5 py-3 font-semibold text-[#291800] shadow-md hover:bg-[#f5a84a] disabled:opacity-60"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
                </span>
              ) : (
                "Publish announcement"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
