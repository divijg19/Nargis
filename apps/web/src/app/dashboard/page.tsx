"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import DashboardHero from "@/components/ui/DashboardHero";
import HabitModal from "@/components/ui/HabitModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { TaskModal } from "@/components/ui/TaskModal";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useDashboard, useMorningBriefing } from "@/hooks/queries";
import { createHabit } from "@/services/endpoints/habits";
import { createTask, updateTask } from "@/services/endpoints/tasks";
import type { CreateHabitRequest, CreateTaskRequest } from "@/types";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const {
    tasks,
    todayTasks,
    completedToday,
    tasksByStatus,
    totalStreaks,
    todaySessionsCount,
  } = useDashboard();
  const router = useRouter();

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createHabitMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "todo" | "done" }) =>
      updateTask(id, { id, status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const briefingQuery = useMorningBriefing();

  const briefingText = briefingQuery.data?.content ?? null;
  const briefingUpdatedAt =
    briefingQuery.data?.updatedAt ?? briefingQuery.data?.createdAt;
  const briefingLoading = briefingQuery.isLoading;
  const hasBriefing = Boolean(briefingText?.trim().length);

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    await createTaskMutation.mutateAsync(taskData);
  };

  const handleCreateHabit = async (habitData: CreateHabitRequest) => {
    await createHabitMutation.mutateAsync(habitData);
  };

  const handleToggleTask = (taskId: string) => {
    const existing = tasks.find((task) => task.id === taskId);
    if (!existing) return;
    const status = existing.status === "done" ? "todo" : "done";
    void updateTaskMutation.mutateAsync({ id: taskId, status });
  };

  const handleStartFocus = () => {
    router.push("/pomodoro");
  };

  const weeklyProgress = Math.round(
    (completedToday / Math.max(todayTasks.length, 1)) * 100,
  );

  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <RequireAuth>
      <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
        <PageCanvas className="gap-8">
          {(briefingLoading || hasBriefing) && (
            <section
              aria-live="polite"
              className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 shadow-sm dark:border-blue-500/20 dark:bg-blue-900/10 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-200/80 bg-white/70 text-blue-600 dark:border-blue-400/30 dark:bg-blue-900/20 dark:text-blue-300">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-base font-semibold text-foreground sm:text-lg">
                    Morning Briefing
                  </h2>
                </div>
                {briefingUpdatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Updated{" "}
                    {briefingUpdatedAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
              </div>

              {briefingLoading ? (
                <div
                  className="space-y-2"
                  role="status"
                  aria-label="Loading briefing"
                >
                  <Skeleton className="h-3 w-full rounded-sm bg-blue-200/60 dark:bg-blue-800/35" />
                  <Skeleton className="h-3 w-11/12 rounded-sm bg-blue-200/60 dark:bg-blue-800/35" />
                  <Skeleton className="h-3 w-9/12 rounded-sm bg-blue-200/60 dark:bg-blue-800/35" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90 sm:text-base">
                  {briefingText}
                </p>
              )}
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.95fr)]">
            <div className="space-y-6">
              <div className="max-w-sm sm:max-w-md">
                <DashboardHero greeting={greeting} />
              </div>

              <DashboardCard title="Task Status Overview" size="xs">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-2.5 text-center transition-[color,background-color,border-color,opacity,box-shadow,transform] hover:shadow-md dark:bg-gray-700/30">
                    <div className="mb-1 text-xl font-semibold tabular-nums text-foreground">
                      {tasksByStatus.todo.length}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      To Do
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-2.5 text-center transition-[color,background-color,border-color,opacity,box-shadow,transform] hover:shadow-md dark:bg-blue-900/20">
                    <div className="mb-1 text-xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {tasksByStatus.inProgress.length}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                      In Progress
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-2.5 text-center transition-[color,background-color,border-color,opacity,box-shadow,transform] hover:shadow-md dark:bg-green-900/20">
                    <div className="mb-1 text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
                      {tasksByStatus.done.length}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-green-700 dark:text-green-300">
                      Completed
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Tasks Completed",
                    value: completedToday,
                  },
                  {
                    label: "Focus Sessions",
                    value: todaySessionsCount,
                  },
                  {
                    label: "Active Streaks",
                    value: totalStreaks,
                  },
                  {
                    label: "Weekly Progress",
                    value: `${weeklyProgress}%`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-structural bg-card p-4"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-3xl font-semibold tracking-tight text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <DashboardCard title="Quick Actions" size="xs">
                <div className="space-y-2">
                  <ActionButton
                    label="Create Task"
                    variant="primary"
                    size="md"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="w-full"
                  />
                  <ActionButton
                    label="Start Focus Session"
                    variant="secondary"
                    size="md"
                    onClick={handleStartFocus}
                    className="w-full"
                  />
                  <ActionButton
                    label="Log Habit"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsHabitModalOpen(true)}
                    className="w-full"
                  />
                </div>
              </DashboardCard>

              <DashboardCard
                title="Today's Tasks"
                size="sm"
                headerAction={
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {todayTasks.length}{" "}
                    {todayTasks.length === 1 ? "task" : "tasks"}
                  </span>
                }
              >
                <TaskPreview
                  tasks={todayTasks}
                  limit={8}
                  onToggleTask={handleToggleTask}
                />
              </DashboardCard>
            </div>
          </div>
        </PageCanvas>

        {/* Modals */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSubmit={handleCreateTask}
        />
        <HabitModal
          isOpen={isHabitModalOpen}
          onClose={() => setIsHabitModalOpen(false)}
          onSubmit={handleCreateHabit}
        />
      </div>
    </RequireAuth>
  );
}
