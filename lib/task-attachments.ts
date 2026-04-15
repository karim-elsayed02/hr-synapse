import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase Storage bucket for task files (create in dashboard + policies; see scripts). */
export const TASK_ATTACHMENTS_BUCKET = "tasks-attachments";

const MAX_BYTES = 15 * 1024 * 1024;

export function sanitizeTaskFileName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return base.length > 0 ? base : "file";
}

export function assertTaskAttachmentFile(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return `File must be under ${MAX_BYTES / (1024 * 1024)} MB`;
  }
  return null;
}

/** Public URL when the bucket is public (recommended policies in scripts/19_tasks_attachments_storage.sql). */
export function taskAttachmentPublicUrl(attachmentPath: string | null | undefined): string | null {
  if (!attachmentPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${TASK_ATTACHMENTS_BUCKET}/${attachmentPath}`;
}

export function attachmentFileLabel(attachmentPath: string | null | undefined): string | null {
  if (!attachmentPath) return null;
  const seg = attachmentPath.split("/").pop();
  if (!seg) return "Attachment";
  const withoutTs = seg.replace(/^\d+_/, "");
  try {
    return decodeURIComponent(withoutTs.replace(/_/g, " "));
  } catch {
    return withoutTs.replace(/_/g, " ");
  }
}

export async function uploadTaskAttachment(
  supabase: SupabaseClient,
  taskId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const msg = assertTaskAttachmentFile(file);
  if (msg) return { error: msg };
  const safe = sanitizeTaskFileName(file.name);
  const path = `${taskId}/${Date.now()}_${safe}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(TASK_ATTACHMENTS_BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) return { error: error.message };
  return { path };
}

export async function removeTaskAttachmentStorage(
  supabase: SupabaseClient,
  attachmentPath: string | null | undefined
): Promise<void> {
  if (!attachmentPath?.trim()) return;
  await supabase.storage.from(TASK_ATTACHMENTS_BUCKET).remove([attachmentPath]);
}
