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
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
                <div className="animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                                Tasks ✓
                            </h1>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
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

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {tasks.length}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Total Tasks
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                {todayTasks.length}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                Due Today
                            </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                                {completedCount}
                            </div>
                            <div className="text-xs text-green-700 dark:text-green-300 uppercase tracking-wide">
                                Completed
                            </div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                                {completionRate}%
                            </div>
                            <div className="text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wide">
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
