"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { TaskModal } from "@/components/ui/TaskModal";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useTaskStore } from "@/contexts/TaskContext";
import type { CreateTaskRequest, Task } from "@/types";

export default function TasksPage() {
  const {
    tasks,
    todayTasks,
    tasksByStatus,
    toggleTask,
    loadTasks,
    addTask,
    updateTask,
    deleteTask,
  } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    if (editingTask) {
      // Update existing task
      await updateTask({ id: editingTask.id, ...taskData });
      setEditingTask(null);
    } else {
      // Create new task
      addTask(taskData);
    }
    setIsModalOpen(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const completionRate =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-app-light transition-all duration-500">
      {/* Premium ambient overlay */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-blue-500/5 to-transparent dark:via-blue-400/10 pointer-events-none" />

      {/* Premium Header */}
      <div className="w-full max-w-[1200px] 2xl:max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-8 py-4">
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 mb-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Tasks
                </span>
                <span className="text-slate-900 dark:text-white"> ✓</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
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
        </div>
      </div>

      {/* Grid wrapper with outer gutters and snug side columns; internal scroll only */}
      <div className="relative flex-1 min-h-0 lg:grid lg:grid-cols-[3rem_16rem_0rem_1fr_0rem_16rem_3rem] lg:gap-0 xl:grid-cols-[4rem_16rem_0rem_1fr_0rem_16rem_4rem] 2xl:grid-cols-[6rem_20rem_0rem_1fr_0rem_24rem_6rem]">
        {/* Column 1: stacked summary stats - left rail */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 justify-self-end space-y-4 lg:col-start-2 lg:col-end-3">
          <div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-2.5 border border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
            <div className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {tasks.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Total Tasks
            </div>
          </div>

          <div className="glass bg-linear-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl rounded-2xl p-2.5 border border-blue-200/60 dark:border-blue-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {todayTasks.length}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Due Today
            </div>
          </div>

          <div className="glass bg-linear-to-br from-green-50/90 to-emerald-50/90 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl rounded-2xl p-2.5 border border-green-200/60 dark:border-green-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
            <div className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
              {completedCount}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300 font-medium">
              Completed
            </div>
          </div>

          <div className="glass bg-linear-to-br from-purple-50/90 to-violet-50/90 dark:from-purple-900/20 dark:to-violet-900/20 backdrop-blur-xl rounded-2xl p-2.5 border border-purple-200/60 dark:border-purple-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              {completionRate}%
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">
              Complete
            </div>
          </div>
        </aside>

        {/* Column 2: Today's Focus (center) and In Progress stacked */}
        <main className="w-full px-3 sm:px-4 lg:px-8 space-y-5 pb-10 lg:col-start-4 lg:col-end-5 h-full overflow-auto">
          {/* Mobile-only summary stats */}
          <div className="lg:hidden flex flex-col space-y-4">
            <div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-2.5 border border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
              <div className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {tasks.length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Total Tasks
              </div>
            </div>

            <div className="glass bg-linear-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl rounded-2xl p-2.5 border border-blue-200/60 dark:border-blue-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {todayTasks.length}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Due Today
              </div>
            </div>

            <div className="glass bg-linear-to-br from-green-50/90 to-emerald-50/90 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl rounded-2xl p-2.5 border border-green-200/60 dark:border-green-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
              <div className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                {completedCount}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                Completed
              </div>
            </div>

            <div className="glass bg-linear-to-br from-purple-50/90 to-violet-50/90 dark:from-purple-900/20 dark:to-violet-900/20 backdrop-blur-xl rounded-2xl p-2.5 border border-purple-200/60 dark:border-purple-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover-elevate">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {completionRate}%
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                Complete
              </div>
            </div>
          </div>

          {todayTasks.length > 0 && (
            <DashboardCard
              title="📅 Today's Focus"
              size="xs"
              headerAction={
                <span className="text-sm text-muted-foreground">
                  {todayTasks.filter((t) => t.completed).length} of{" "}
                  {todayTasks.length} done
                </span>
              }
            >
              <div className="max-h-[32vh] lg:max-h-[35vh] overflow-auto pr-1">
                <TaskPreview
                  tasks={todayTasks}
                  limit={6}
                  onToggleTask={toggleTask}
                />
              </div>
            </DashboardCard>
          )}

          <DashboardCard
            title="In Progress"
            size="xs"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {tasksByStatus.inProgress.length}
              </span>
            }
          >
            <div className="max-h-[32vh] lg:max-h-[35vh] overflow-auto pr-1">
              <TaskPreview
                tasks={tasksByStatus.inProgress}
                limit={6}
                onToggleTask={toggleTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                showActions={true}
              />
            </div>
          </DashboardCard>

          {/* Mobile-only task lists */}
          <div className="lg:hidden flex flex-col space-y-6">
            <DashboardCard
              title="To Do"
              size="xs"
              headerAction={
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-foreground dark:bg-gray-700 dark:text-gray-300">
                  {tasksByStatus.todo.length}
                </span>
              }
            >
              <div className="max-h-[45vh] overflow-auto pr-1">
                <TaskPreview
                  tasks={tasksByStatus.todo}
                  limit={8}
                  onToggleTask={toggleTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  showActions={true}
                />
              </div>
            </DashboardCard>

            <DashboardCard
              title="Completed"
              size="xs"
              headerAction={
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {tasksByStatus.done.length}
                </span>
              }
            >
              <div className="max-h-[45vh] overflow-auto pr-1">
                <TaskPreview
                  tasks={tasksByStatus.done}
                  limit={8}
                  onToggleTask={toggleTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  showActions={true}
                />
              </div>
            </DashboardCard>
          </div>
        </main>

        {/* Column 3: stacked task lists - right rail */}
        <aside className="hidden lg:flex flex-col w-full justify-self-start space-y-2 lg:col-start-6 lg:col-end-7">
          <DashboardCard
            title="To Do"
            size="xs"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-foreground dark:bg-gray-700 dark:text-gray-300">
                {tasksByStatus.todo.length}
              </span>
            }
          >
            <div className="h-36 lg:h-40 pr-1">
              <TaskPreview
                tasks={tasksByStatus.todo}
                limit={3}
                onToggleTask={toggleTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                showActions={true}
              />
            </div>
          </DashboardCard>

          <DashboardCard
            title="Completed"
            size="xs"
            headerAction={
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {tasksByStatus.done.length}
              </span>
            }
          >
            <div className="h-36 lg:h-40 pr-1">
              <TaskPreview
                tasks={tasksByStatus.done}
                limit={3}
                onToggleTask={toggleTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                showActions={true}
              />
            </div>
          </DashboardCard>
        </aside>
      </div>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleCreateTask}
        initialData={editingTask || undefined}
      />
    </div>
  );
}
