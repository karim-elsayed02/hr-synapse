"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Pencil } from "lucide-react";
import { TaskAttachmentPreview } from "@/components/tasks/task-attachment-preview";
import { attachmentFileLabel } from "@/lib/task-attachments";

type EditTaskDialogProps = {
  task: {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    assigned_hours: number;
    attachment_path: string | null;
  };
};

export function EditTaskDialog({ task }: EditTaskDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  const existingLabel = attachmentFileLabel(task.attachment_path);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      if (removeAttachment) {
        fd.set("removeAttachment", "1");
      }

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: fd,
        credentials: "same-origin",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(typeof json.error === "string" ? json.error : "Failed to update task");
        return;
      }

      setOpen(false);
      setRemoveAttachment(false);
      router.refresh();
    } catch (err) {
      console.error("Update task failed:", err);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-full bg-[#001A3D]/8 px-3 py-1.5 text-xs font-semibold text-[#001A3D] transition-colors hover:bg-[#001A3D]/12"
        >
          <span className="inline-flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-0 bg-white p-0 shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
        <DialogHeader className="px-6 pb-0 pt-6">
          <DialogTitle className="font-display text-xl font-semibold text-[#001A3D]">
            Edit task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4">
          {submitError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200/80">
              {submitError}
            </p>
          )}
          <fieldset disabled={pending} className="space-y-5">
            <div>
              <label htmlFor="et-title" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                Title
              </label>
              <input
                id="et-title"
                name="title"
                required
                defaultValue={task.title}
                className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] placeholder:text-[#001A3D]/35 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
              />
            </div>

            <div>
              <label htmlFor="et-desc" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                Description
              </label>
              <textarea
                id="et-desc"
                name="description"
                rows={3}
                defaultValue={task.description ?? ""}
                className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] placeholder:text-[#001A3D]/35 focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="et-hours" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                  Assigned hours
                </label>
                <input
                  id="et-hours"
                  name="assignedHours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  defaultValue={String(task.assigned_hours)}
                  required
                  className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                />
              </div>

              <div>
                <label htmlFor="et-due" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                  Due date
                </label>
                <input
                  id="et-due"
                  name="dueDate"
                  type="date"
                  defaultValue={task.due_date ? task.due_date.slice(0, 10) : ""}
                  className="w-full rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#001A3D] focus:outline-none focus:ring-2 focus:ring-[#FFB84D]/40"
                />
              </div>
            </div>

            <div>
              <label htmlFor="et-file" className="mb-1.5 block text-sm font-medium text-[#001A3D]/80">
                Attachment
              </label>
              {task.attachment_path ? (
                <div className="mb-3 space-y-2 rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#001A3D]/60">Current file:</span>
                    <TaskAttachmentPreview
                      taskId={task.id}
                      attachmentPath={task.attachment_path}
                      label={existingLabel ?? "View file"}
                      className="inline-flex items-center gap-1.5 font-medium text-sky-700 underline-offset-2 hover:underline"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-[#001A3D]/70">
                    <input
                      type="checkbox"
                      checked={removeAttachment}
                      onChange={(e) => setRemoveAttachment(e.target.checked)}
                    />
                    Remove attachment
                  </label>
                </div>
              ) : null}
              <input
                id="et-file"
                name="attachment"
                type="file"
                className="w-full text-sm text-[#001A3D] file:mr-3 file:rounded-lg file:border-0 file:bg-[#001A3D]/8 file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#001A3D]"
              />
              <p className="mt-1 text-xs text-[#001A3D]/45">
                {task.attachment_path
                  ? "Upload a file to replace the current attachment (optional)."
                  : "PDF, images, or documents — max 15 MB."}
              </p>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-[#FFB84D] px-5 py-3 text-sm font-semibold text-[#291800] shadow-md transition-colors hover:bg-[#f5a84a] disabled:opacity-60"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Save changes"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
