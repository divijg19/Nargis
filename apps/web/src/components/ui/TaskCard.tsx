"use client";

import type { Task } from "@/types";
import { cn } from "@/utils";

export interface TaskCardProps {
  task: Task;
  onStart: (task: Task) => void;
  onComplete: (task: Task) => void;
  onReopen: (task: Task) => void;
  disabled?: boolean;
}

function statusPill(task: Task) {
  if (task.status === "done") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (task.status === "inProgress") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
}

function statusLabel(task: Task) {
  if (task.status === "done") return "Completed";
  if (task.status === "inProgress") return "In Progress";
  return "Pending";
}

export function TaskCard({
  task,
  onStart,
  onComplete,
  onReopen,
  disabled = false,
}: TaskCardProps) {
  return (
    <article className="rounded-xl border border-border/40 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
            {task.title}
          </h3>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {task.description}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground/70">
              No description
            </p>
          )}
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
            statusPill(task),
          )}
        >
          {statusLabel(task)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{task.priority} priority</span>
        <span>
          {task.dueDate ? task.dueDate.toLocaleDateString() : "No due date"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm">
        {task.status === "todo" && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onStart(task)}
            className="font-medium text-sky-700 transition-colors hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-300 dark:hover:text-sky-200"
          >
            [Start]
          </button>
        )}

        {task.status === "inProgress" && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onComplete(task)}
            className="font-medium text-emerald-700 transition-colors hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            [Complete]
          </button>
        )}

        {task.status === "done" && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onReopen(task)}
            className="font-medium text-amber-700 transition-colors hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300 dark:hover:text-amber-200"
          >
            [Reopen]
          </button>
        )}
      </div>
    </article>
  );
}
