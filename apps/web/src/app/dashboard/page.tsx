"use client";

import { useEffect } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { StatCard } from "@/components/ui/StatCard";
import { TaskPreview } from "@/components/ui/TaskPreview";
import { useHabitStore } from "@/contexts/HabitContext";
import { usePomodoroStore } from "@/contexts/PomodoroContext";
import { useTaskStore } from "@/contexts/TaskContext";

function DashboardContent() {
    const { todayTasks, completedToday, tasksByStatus, toggleTask, loadTasks } =
        useTaskStore();

    const { totalStreaks } = useHabitStore();
    const { todaySessionsCount } = usePomodoroStore();

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const weeklyProgress = Math.round(
        (completedToday / Math.max(todayTasks.length, 1)) * 100,
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Welcome back!
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Here's your productivity overview
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Tasks Completed Today"
                        value={completedToday}
                        icon="✅"
                    />
                    <StatCard
                        title="Pomodoros Completed"
                        value={todaySessionsCount}
                        icon="🍅"
                    />
                    <StatCard title="Total Streaks" value={totalStreaks} icon="🔥" />
                    <StatCard
                        title="Weekly Goal"
                        value={`${weeklyProgress}%`}
                        icon="📊"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <DashboardCard title="Quick Actions" className="lg:col-span-1">
                        <div className="space-y-3">
                            <ActionButton
                                icon="➕"
                                label="Add Task"
                                variant="primary"
                                onClick={() => console.log("Add task clicked")}
                                className="w-full"
                            />{" "}
                            {/* TODO: Hook up to task creation modal */}
                            <ActionButton
                                icon="🍅"
                                label="Start Focus"
                                variant="secondary"
                                onClick={() => console.log("Start focus clicked")}
                                className="w-full"
                            />{" "}
                            {/* TODO: Open Pomodoro panel inline */}
                            <ActionButton
                                icon="⚡"
                                label="Track Habit"
                                variant="secondary"
                                onClick={() => console.log("Track habit clicked")}
                                className="w-full"
                            />{" "}
                            {/* TODO: Increment selected habit */}
                        </div>
                    </DashboardCard>

                    <DashboardCard
                        title="Today's Tasks"
                        className="lg:col-span-2"
                        headerAction={
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {todayTasks.length} tasks
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

                <div className="grid grid-cols-1 gap-8">
                    <DashboardCard title="Task Overview">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                                    {tasksByStatus.todo.length}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    To Do
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {tasksByStatus.inProgress.length}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    In Progress
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {tasksByStatus.done.length}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Completed
                                </div>
                            </div>
                        </div>
                    </DashboardCard>
                </div>
            </main>
        </div>
    );
}

export default function DashboardPage() {
    return <DashboardContent />;
}
