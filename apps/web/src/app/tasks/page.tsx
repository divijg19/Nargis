"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { TaskModal } from "@/components/ui/TaskModal";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useTasks } from "@/hooks/queries";
import { createTask, deleteTask, updateTask } from "@/services/endpoints/tasks";
import type { CreateTaskRequest, Task, UpdateTaskRequest } from "@/types";

export default function TasksPage() {
  const queryClient = useQueryClient();
  const tasksQuery = useTasks();
  const tasks = tasksQuery.data ?? [];
  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    const d = new Date();
    setTodayKey(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }, []);

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskRequest }) =>
      updateTask(id, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const todayTasks = useMemo(() => {
    if (!todayKey) return [];
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueKey = `${task.dueDate.getFullYear()}-${task.dueDate.getMonth()}-${task.dueDate.getDate()}`;
      return dueKey === todayKey;
    });
  }, [tasks, todayKey]);

  const tasksByStatus = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === "todo"),
      inProgress: tasks.filter((task) => task.status === "inProgress"),
      done: tasks.filter((task) => task.status === "done"),
    }),
    [tasks],
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    if (editingTask) {
      await updateMutation.mutateAsync({
        id: editingTask.id,
        updates: { id: editingTask.id, ...taskData },
      });
      setEditingTask(null);
    } else {
      await createMutation.mutateAsync(taskData);
    }
    setIsModalOpen(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteMutation.mutateAsync(taskId);
  };

  const handleToggleTask = async (taskId: string) => {
    const existing = tasks.find((task) => task.id === taskId);
    if (!existing) return;
    const nextStatus = existing.status === "done" ? "todo" : "done";
    await updateMutation.mutateAsync({
      id: taskId,
      updates: { id: taskId, status: nextStatus },
    });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const completionRate =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (tasksQuery.isLoading) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
        <PageCanvas className="gap-8">
          <div className="animate-fade-in">
            <div className="mb-3 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
                  Tasks
                </h1>
                <p className="text-base text-muted-foreground">
                  Organize and track your work.
                </p>
              </div>
              <ActionButton
                label="New Task"
                variant="primary"
                onClick={() => setIsModalOpen(true)}
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.95fr)]">
            <div className="grid gap-6 lg:grid-cols-2">
              {todayTasks.length > 0 && (
                <DashboardCard
                  title="Today's Focus"
                  size="xs"
                  className="lg:col-span-2"
                  headerAction={
                    <span className="text-sm text-muted-foreground">
                      {todayTasks.filter((t) => t.completed).length} of{" "}
                      {todayTasks.length} done
                    </span>
                  }
                >
                  <TaskPreview
                    tasks={todayTasks}
                    limit={6}
                    onToggleTask={handleToggleTask}
                  />
                </DashboardCard>
              )}

              <DashboardCard
                title="To Do"
                size="xs"
                headerAction={
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-foreground dark:bg-gray-700 dark:text-gray-300">
                    {tasksByStatus.todo.length}
                  </span>
                }
              >
                <TaskPreview
                  tasks={tasksByStatus.todo}
                  limit={8}
                  onToggleTask={handleToggleTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  showActions={true}
                />
              </DashboardCard>

              <DashboardCard
                title="In Progress"
                size="xs"
                headerAction={
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {tasksByStatus.inProgress.length}
                  </span>
                }
              >
                <TaskPreview
                  tasks={tasksByStatus.inProgress}
                  limit={8}
                  onToggleTask={handleToggleTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  showActions={true}
                />
              </DashboardCard>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Total Tasks", value: tasks.length },
                  { label: "Due Today", value: todayTasks.length },
                  { label: "Completed", value: completedCount },
                  { label: "Complete", value: `${completionRate}%` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border/25 bg-card p-4"
                  >
                    <div className="mb-2 text-2xl font-semibold text-foreground">
                      {item.value}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              <DashboardCard
                title="Completed"
                size="xs"
                headerAction={
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {tasksByStatus.done.length}
                  </span>
                }
              >
                <TaskPreview
                  tasks={tasksByStatus.done}
                  limit={8}
                  onToggleTask={handleToggleTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  showActions={true}
                />
              </DashboardCard>
            </div>
          </div>
        </PageCanvas>

        {/* Task Creation Modal */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleCreateTask}
          initialData={editingTask || undefined}
        />
      </div>
    </RequireAuth>
  );
}
