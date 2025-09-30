"use client";

import { useEffect } from "react";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useTaskStore } from "@/contexts/TaskContext";

export default function TasksPage() {
    const { tasks, todayTasks, toggleTask, loadTasks } = useTaskStore();

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <h1 className="text-3xl font-bold mb-2">Tasks</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Manage all your tasks and stay focused.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DashboardCard
                    title="Today's Tasks"
                    headerAction={
                        <span className="text-sm text-gray-500">{todayTasks.length}</span>
                    }
                >
                    <TaskPreview tasks={todayTasks} onToggleTask={toggleTask} />
                </DashboardCard>
                <DashboardCard
                    title="All Tasks"
                    headerAction={
                        <span className="text-sm text-gray-500">{tasks.length}</span>
                    }
                >
                    <TaskPreview tasks={tasks} limit={15} onToggleTask={toggleTask} />
                </DashboardCard>
            </div>
        </div>
    );
}
