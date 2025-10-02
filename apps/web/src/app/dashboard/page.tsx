"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import HabitModal from "@/components/ui/HabitModal";
import { StatCard } from "@/components/ui/StatCard";
import { TaskModal } from "@/components/ui/TaskModal";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useHabitStore } from "@/contexts/HabitContext";
import { usePomodoroStore } from "@/contexts/PomodoroContext";
import { useTaskStore } from "@/contexts/TaskContext";
import type { CreateHabitRequest, CreateTaskRequest } from "@/types";

function DashboardContent() {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 transition-all duration-500">
      {/* Premium ambient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent dark:via-primary/10 pointer-events-none" />

      {/* Premium Hero Header */}
      <header className="relative mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 animate-fade-in">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
                {getGreeting()}!
              </span>
              <span className="text-slate-900 dark:text-white"> 👋</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 animate-slide-up max-w-2xl">
              Here's your productivity overview for today
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pb-16">
        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-scale-in">
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
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Quick Actions */}
          <DashboardCard title="Quick Actions" className="lg:col-span-1">
            <div className="space-y-3">
              <ActionButton
                icon="➕"
                label="Create Task"
                variant="primary"
                onClick={() => setIsTaskModalOpen(true)}
                className="w-full"
              />
              <ActionButton
                icon="🍅"
                label="Start Focus Session"
                variant="secondary"
                onClick={handleStartFocus}
                className="w-full"
              />
              <ActionButton
                icon="⚡"
                label="Log Habit"
                variant="secondary"
                onClick={() => setIsHabitModalOpen(true)}
                className="w-full"
              />
            </div>
          </DashboardCard>

          {/* Today's Tasks */}
          <DashboardCard
            title="Today's Tasks"
            className="lg:col-span-2"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
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

        {/* Task Overview */}
        <DashboardCard title="Task Status Overview">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-700/30 transition-all hover:shadow-md">
              <div className="text-4xl font-bold text-gray-700 dark:text-gray-300 mb-2 tabular-nums">
                {tasksByStatus.todo.length}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                To Do
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-gray-500 dark:bg-gray-400 h-2 rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div className="text-center p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 transition-all hover:shadow-md">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2 tabular-nums">
                {tasksByStatus.inProgress.length}
              </div>
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                In Progress
              </div>
              <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800/30 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            <div className="text-center p-6 rounded-xl bg-green-50 dark:bg-green-900/20 transition-all hover:shadow-md">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2 tabular-nums">
                {tasksByStatus.done.length}
              </div>
              <div className="text-sm font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                Completed
              </div>
              <div className="mt-2 w-full bg-green-200 dark:bg-green-800/30 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </DashboardCard>
      </main>

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

export default function DashboardPage() {
  return <DashboardContent />;
}
