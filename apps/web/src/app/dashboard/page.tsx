"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import DashboardHero from "@/components/ui/DashboardHero";
import HabitModal from "@/components/ui/HabitModal";
import { StatCard } from "@/components/ui/StatCard";
import { TaskModal } from "@/components/ui/TaskModal";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useHabitStore } from "@/contexts/HabitContext";
import { usePomodoroStore } from "@/contexts/PomodoroContext";
import { useTaskStore } from "@/contexts/TaskContext";
import type { CreateHabitRequest, CreateTaskRequest } from "@/types";

export default function DashboardPage() {
  const {
    todayTasks,
    completedToday,
    tasksByStatus,
    toggleTask,
    loadTasks,
    addTask,
  } = useTaskStore();
  const { totalStreaks, addHabit } = useHabitStore();
  const { todaySessionsCount } = usePomodoroStore();
  const router = useRouter();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = (taskData: CreateTaskRequest) => {
    addTask(taskData);
  };

  const handleCreateHabit = (habitData: CreateHabitRequest) => {
    addHabit(habitData);
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
    <div className="h-screen overflow-hidden flex flex-col pt-8 md:pt-12 bg-app-light transition-all duration-500">
      {/* Quick Actions: rendered beneath the hero (desktop) - mobile kept in the stacked area */}

      {/* Grid wrapper in a flex container to enable internal scrolling only */}
      <div className="relative flex-1 min-h-0 lg:grid lg:grid-cols-[3rem_18rem_0rem_1fr_0rem_16rem_3rem] lg:gap-0 xl:grid-cols-[4rem_18rem_0rem_1fr_0rem_16rem_4rem] 2xl:grid-cols-[6rem_18rem_0rem_1fr_0rem_16rem_6rem]">
        {/* Today's Tasks: left rail, sticky within its column */}
        <aside className="hidden lg:flex flex-col sticky top-16 w-64 xl:w-72 justify-self-end gap-4 z-30 lg:col-start-2 lg:col-end-3">
          <DashboardCard
            title="Today's Tasks"
            size="sm"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
              </span>
            }
          >
            <div className="w-full">
              <TaskPreview
                tasks={todayTasks}
                limit={8}
                onToggleTask={toggleTask}
              />
            </div>
          </DashboardCard>
        </aside>

        {/* Center content column */}
        <main className="w-full max-w-5xl mx-auto px-3 sm:px-4 lg:px-8 space-y-6 lg:space-y-8 pb-14 lg:pb-16 lg:col-start-4 lg:col-end-5 h-full overflow-auto">
          <div className="app-viewport-available">
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              {/* Mobile-only stacked left area */}
              <div className="lg:hidden flex flex-col gap-4">
                <DashboardCard title="Quick Actions" size="xs">
                  <div className="space-y-2">
                    <ActionButton
                      icon="➕"
                      label="Create Task"
                      variant="primary"
                      size="sm"
                      onClick={() => setIsTaskModalOpen(true)}
                      className="w-full"
                    />
                    <ActionButton
                      icon="🍅"
                      label="Start Focus Session"
                      variant="secondary"
                      size="sm"
                      onClick={handleStartFocus}
                      className="w-full"
                    />
                    <ActionButton
                      icon="⚡"
                      label="Log Habit"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsHabitModalOpen(true)}
                      className="w-full"
                    />
                  </div>
                </DashboardCard>

                <DashboardCard
                  title="Today's Tasks"
                  size="sm"
                  headerAction={
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {todayTasks.length}{" "}
                      {todayTasks.length === 1 ? "task" : "tasks"}
                    </span>
                  }
                >
                  <TaskPreview
                    tasks={todayTasks}
                    limit={5}
                    onToggleTask={toggleTask}
                  />
                </DashboardCard>
              </div>
              {/* Stack Task Status Overview above the hero, center hero in available viewport */}
              <div className="w-full flex flex-col items-center gap-1 lg:-mt-12">
                <div className="w-full max-w-md sm:max-w-lg">
                  <DashboardCard title="Task Status Overview" size="xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="text-center p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 transition-all hover:shadow-md">
                        <div className="text-xl font-semibold text-foreground mb-1 tabular-nums">
                          {tasksByStatus.todo.length}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          To Do
                        </div>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                          <div
                            className="bg-gray-500 dark:bg-gray-400 h-1 rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                      <div className="text-center p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 transition-all hover:shadow-md">
                        <div className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-1 tabular-nums">
                          {tasksByStatus.inProgress.length}
                        </div>
                        <div className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                          In Progress
                        </div>
                        <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800/30 rounded-full h-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                      <div className="text-center p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 transition-all hover:shadow-md">
                        <div className="text-xl font-semibold text-green-600 dark:text-green-400 mb-1 tabular-nums">
                          {tasksByStatus.done.length}
                        </div>
                        <div className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                          Completed
                        </div>
                        <div className="mt-2 w-full bg-green-200 dark:bg-green-800/30 rounded-full h-1">
                          <div
                            className="bg-green-500 h-1 rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                    </div>
                  </DashboardCard>
                </div>

                <div className="w-full flex flex-col gap-0 items-center">
                  <div className="w-full flex items-start justify-center">
                    <div className="w-full max-w-sm sm:max-w-md mt-0">
                      <DashboardHero greeting={greeting} />
                    </div>
                  </div>

                  {/* Desktop Quick Actions: beneath the hero, aligned to the hero's left edge */}
                  <div className="w-full max-w-lg hidden lg:flex lg:justify-start lg:-mt-6">
                    <div className="w-72">
                      <DashboardCard title="Quick Actions" size="xs">
                        <div className="space-y-2">
                          <ActionButton
                            icon="➕"
                            label="Create Task"
                            variant="primary"
                            size="md"
                            onClick={() => setIsTaskModalOpen(true)}
                            className="w-full"
                          />
                          <ActionButton
                            icon="🍅"
                            label="Start Focus Session"
                            variant="secondary"
                            size="md"
                            onClick={handleStartFocus}
                            className="w-full"
                          />
                          <ActionButton
                            icon="⚡"
                            label="Log Habit"
                            variant="secondary"
                            size="md"
                            onClick={() => setIsHabitModalOpen(true)}
                            className="w-full"
                          />
                        </div>
                      </DashboardCard>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right stat stack: right rail, sticky within its column */}
        <aside className="hidden lg:flex flex-col sticky top-16 w-48 xl:w-56 justify-self-start gap-3 z-20 lg:col-start-6 lg:col-end-7">
          <StatCard title="Tasks Completed" value={completedToday} icon="✅" />
          <StatCard
            title="Focus Sessions"
            value={todaySessionsCount}
            icon="🍅"
          />
          <StatCard title="Active Streaks" value={totalStreaks} icon="🔥" />
          <StatCard
            title="Weekly Progress"
            value={`${weeklyProgress}%`}
            icon="📊"
          />
        </aside>
      </div>

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
  );
}
