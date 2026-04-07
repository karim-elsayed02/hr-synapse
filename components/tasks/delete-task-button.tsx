"use client";

import { deleteTask } from "@/lib/actions/task-actions";
import { Trash2 } from "lucide-react";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  return (
    <form
      action={deleteTask}
      className="inline"
      onSubmit={(e) => {
        if (!confirm("Delete this task? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        title="Delete task"
        aria-label="Delete task"
        className="rounded-lg p-1.5 text-[#001A3D]/35 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
