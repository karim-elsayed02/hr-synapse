"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { attachmentFileLabel } from "@/lib/task-attachments";
import { Download, ExternalLink, Loader2, Paperclip } from "lucide-react";

type PreviewKind = "image" | "pdf" | "office" | "other";

function previewKindFromPath(path: string): PreviewKind {
  const seg = path.split("/").pop() ?? "";
  const lower = seg.replace(/^\d+_/, "").split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(lower)) return "image";
  if (/\.pdf$/i.test(lower)) return "pdf";
  if (/\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(lower)) return "office";
  return "other";
}

function officeEmbedUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export type TaskAttachmentPreviewProps = {
  taskId: string;
  attachmentPath: string;
  label?: string | null;
  className?: string;
  compact?: boolean;
};

export function TaskAttachmentPreview({
  taskId,
  attachmentPath,
  label,
  className,
  compact,
}: TaskAttachmentPreviewProps) {
  const [open, setOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);

  const displayLabel = label ?? attachmentFileLabel(attachmentPath) ?? "Attachment";
  const kind = previewKindFromPath(attachmentPath);

  useEffect(() => {
    if (!open) {
      setResolvedUrl(null);
      setFetchError(null);
      setMediaError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setMediaError(false);
    let cancelled = false;

    fetch(`/api/tasks/${taskId}/attachment-url`, { credentials: "same-origin" })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Failed to load file");
        }
        if (typeof json.url !== "string" || !json.url) {
          throw new Error("No file URL returned");
        }
        if (!cancelled) setResolvedUrl(json.url);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setFetchError(e instanceof Error ? e.message : "Failed to load file");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setFetchError(null);
          setMediaError(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            className ??
            (compact
              ? "inline-flex max-w-full items-center gap-1 text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
              : "mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 underline-offset-2 hover:underline")
          }
        >
          <Paperclip className="h-3.5 w-3.5 shrink-0" />
          <span className={compact ? "max-w-[8rem] truncate" : undefined}>{displayLabel}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-[min(96vw,56rem)] flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0">
        <DialogHeader className="shrink-0 border-b border-[#001A3D]/8 px-6 py-4 pr-14">
          <DialogTitle className="font-display text-left text-lg font-semibold text-[#001A3D]">
            {displayLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto bg-[#f8f9fa] px-4 py-4">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-[#001A3D]/55">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading file…
            </div>
          ) : fetchError ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center text-sm text-[#001A3D]/70 shadow-sm">
              <p className="font-medium text-[#001A3D]">Could not open this attachment</p>
              <p className="mt-2 text-xs text-[#001A3D]/55">{fetchError}</p>
              <p className="mt-3 text-xs text-[#001A3D]/45">
                Ensure the bucket <code className="rounded bg-[#001A3D]/8 px-1">tasks-attachments</code> exists and
                files were uploaded. For signed links, add{" "}
                <code className="rounded bg-[#001A3D]/8 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to your server
                environment.
              </p>
            </div>
          ) : mediaError ? (
            <div className="rounded-xl bg-white px-6 py-8 text-center text-sm text-[#001A3D]/70 shadow-sm">
              <p className="font-medium text-[#001A3D]">Preview failed to load</p>
              <p className="mt-2 text-xs text-[#001A3D]/55">Try Open in new tab or Download below.</p>
            </div>
          ) : resolvedUrl && kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from our API
            <img
              src={resolvedUrl}
              alt=""
              className="mx-auto max-h-[min(70vh,720px)] w-auto max-w-full rounded-lg object-contain shadow-sm"
              onError={() => setMediaError(true)}
            />
          ) : resolvedUrl && kind === "pdf" ? (
            <iframe
              title={displayLabel}
              src={resolvedUrl}
              className="h-[min(72vh,720px)] w-full rounded-lg border border-[#001A3D]/10 bg-white"
            />
          ) : resolvedUrl && kind === "office" ? (
            <iframe
              title={displayLabel}
              src={officeEmbedUrl(resolvedUrl)}
              className="h-[min(72vh,720px)] w-full rounded-lg border border-[#001A3D]/10 bg-white"
            />
          ) : resolvedUrl ? (
            <div className="rounded-xl bg-white px-6 py-10 text-center text-sm text-[#001A3D]/70 shadow-sm">
              <p>Inline preview isn&apos;t available for this file type.</p>
              <p className="mt-2 text-xs text-[#001A3D]/45">Use the actions below to open or download.</p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#001A3D]/8 bg-white px-4 py-3">
          <a
            href={resolvedUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#001A3D]/15 bg-white px-4 py-2 text-xs font-semibold text-[#001A3D] transition-colors hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-40"
            aria-disabled={!resolvedUrl}
            onClick={(e) => {
              if (!resolvedUrl) e.preventDefault();
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
          <a
            href={resolvedUrl ?? undefined}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#001A3D] px-4 py-2 text-xs font-semibold text-[#FFB84D] transition-colors hover:bg-[#011b3e] disabled:pointer-events-none disabled:opacity-40"
            aria-disabled={!resolvedUrl}
            onClick={(e) => {
              if (!resolvedUrl) e.preventDefault();
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
