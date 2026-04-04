"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { TaskCard } from "@/components/ui/TaskCard";
import { useTasks } from "@/hooks/queries";
import { updateTask } from "@/services/endpoints/tasks";
import type { Task, UpdateTaskRequest } from "@/types";

type BoardStatus = "pending" | "in_progress" | "completed";

const BOARD_COLUMNS: Array<{ status: BoardStatus; title: string }> = [
  { status: "pending", title: "Pending" },
  { status: "in_progress", title: "In Progress" },
  { status: "completed", title: "Completed" },
];

function toBoardStatus(task: Task): BoardStatus {
  if (task.status === "done") return "completed";
  if (task.status === "inProgress") return "in_progress";
  return "pending";
}

function fromBoardStatus(status: BoardStatus): Task["status"] {
  if (status === "completed") return "done";
  if (status === "in_progress") return "inProgress";
  return "todo";
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const tasksQuery = useTasks();
  const tasks = tasksQuery.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskRequest }) =>
      updateTask(id, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const tasksByColumn = useMemo(() => {
    const grouped: Record<BoardStatus, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };

    for (const task of tasks) {
      grouped[toBoardStatus(task)].push(task);
    }

    return grouped;
  }, [tasks]);

  const transitionTask = (task: Task, next: BoardStatus) => {
    if (toBoardStatus(task) === next) return;

    updateMutation.mutate({
      id: task.id,
      updates: {
        id: task.id,
        status: fromBoardStatus(next),
        completed: next === "completed",
      },
    });
  };

  if (tasksQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (tasksQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Could not load tasks right now.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
      <PageCanvas className="gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
            Tasks
          </h1>
          <p className="text-base text-muted-foreground">
            Focused kanban board powered directly by your live task query.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {BOARD_COLUMNS.map((column) => {
            const columnTasks = tasksByColumn[column.status];

            return (
              <div
                key={column.status}
                className="rounded-2xl border border-border/40 bg-gray-50/50 p-4 dark:bg-gray-900/20"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">
                    {column.title}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/50 bg-card/60 px-3 py-6 text-center text-sm text-muted-foreground">
                      No tasks in this lane.
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        disabled={updateMutation.isPending}
                        onStart={(t) => transitionTask(t, "in_progress")}
                        onComplete={(t) => transitionTask(t, "completed")}
                        onReopen={(t) => transitionTask(t, "pending")}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </PageCanvas>
    </div>
  );
}
