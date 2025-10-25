"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { TaskModal } from "@/components/ui/TaskModal";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useTaskStore } from "@/contexts/TaskContext";
import type { CreateTaskRequest } from "@/types";

export default function TasksPage() {
  const { tasks, todayTasks, tasksByStatus, toggleTask, loadTasks, addTask } =
    useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    addTask(taskData);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const completionRate =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20 transition-all duration-500">
      {/* Premium ambient overlay */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-blue-500/5 to-transparent dark:via-blue-400/10 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 py-4">
        {/* Premium Header */}
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-3">
                <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Tasks
                </span>
                <span className="text-slate-900 dark:text-white"> ✓</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300">
                Organize and track your work
              </p>
            </div>
            <ActionButton
              icon="➕"
              label="New Task"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            />
          </div>

          {/* Premium Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 animate-scale-in">
            <div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {tasks.length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Total Tasks
              </div>
            </div>
            <div className="glass bg-linear-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-200/60 dark:border-blue-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {todayTasks.length}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Due Today
              </div>
            </div>
            <div className="glass bg-linear-to-br from-green-50/90 to-emerald-50/90 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl rounded-2xl p-6 border border-green-200/60 dark:border-green-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {completedCount}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                Completed
              </div>
            </div>
            <div className="glass bg-linear-to-br from-purple-50/90 to-violet-50/90 dark:from-purple-900/20 dark:to-violet-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-200/60 dark:border-purple-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {completionRate}%
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                Complete
              </div>
            </div>
          </div>
        </div>

        {/* Task Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* To Do */}
          <DashboardCard
            title="To Do"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                {tasksByStatus.todo.length}
              </span>
            }
          >
            <TaskPreview
              tasks={tasksByStatus.todo}
              limit={10}
              onToggleTask={toggleTask}
            />
          </DashboardCard>

          {/* In Progress */}
          <DashboardCard
            title="In Progress"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {tasksByStatus.inProgress.length}
              </span>
            }
          >
            <TaskPreview
              tasks={tasksByStatus.inProgress}
              limit={10}
              onToggleTask={toggleTask}
            />
          </DashboardCard>

          {/* Done */}
          <DashboardCard
            title="Completed"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {tasksByStatus.done.length}
              </span>
            }
          >
            <TaskPreview
              tasks={tasksByStatus.done}
              limit={10}
              onToggleTask={toggleTask}
            />
          </DashboardCard>
        </div>

        {/* Today's Focus */}
        {todayTasks.length > 0 && (
          <DashboardCard
            title="📅 Today's Focus"
            headerAction={
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {todayTasks.filter((t) => t.completed).length} of{" "}
                {todayTasks.length} done
              </span>
            }
          >
            <TaskPreview
              tasks={todayTasks}
              limit={10}
              onToggleTask={toggleTask}
            />
          </DashboardCard>
        )}
      </div>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
