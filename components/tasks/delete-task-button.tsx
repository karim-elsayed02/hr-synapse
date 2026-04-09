"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTask } from "@/lib/actions/task-actions";
import { Trash2 } from "lucide-react";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      const { error } = await deleteTask(fd);
      if (error) {
        alert(error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      title="Delete task"
      aria-label="Delete task"
      disabled={pending}
      onClick={handleClick}
      className="rounded-lg p-1.5 text-[#001A3D]/35 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
