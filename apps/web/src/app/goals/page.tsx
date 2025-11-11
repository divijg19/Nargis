"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import GoalModal from "@/components/ui/GoalModal";
import { useGoalStore } from "@/contexts/GoalContext";
import type { CreateGoalRequest, Goal } from "@/types";

export default function GoalsPage() {
    const { goals, activeGoals, completedGoals, loadGoals, addGoal, updateGoal } =
        useGoalStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    const handleCreateGoal = async (goalData: CreateGoalRequest): Promise<Goal> => {
        const goal = await addGoal(goalData);
        setIsModalOpen(false);
        return goal;
    };

    const handleToggleStatus = async (
        goalId: string,
        currentStatus: Goal["status"],
    ) => {
        const newStatus =
            currentStatus === "active"
                ? "paused"
                : currentStatus === "paused"
                    ? "active"
                    : "completed";
        await updateGoal({ id: goalId, status: newStatus });
    };

    return (
        <div className="min-h-screen pt-24 md:pt-28 bg-app-light transition-all duration-500">
            {/* Premium ambient overlay */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-purple-500/5 to-transparent dark:via-purple-400/10 pointer-events-none" />

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-4">
                {/* Header */}
                <div className="animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                                Goals
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Set meaningful goals and let AI guide your journey
                            </p>
                        </div>
                        <ActionButton
                            icon="+"
                            label="New Goal"
                            variant="primary"
                            onClick={() => setIsModalOpen(true)}
                            className="w-full sm:w-auto"
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {goals.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Total Goals</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {activeGoals.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Active</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {completedGoals.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {goals.length > 0
                                    ? Math.round(
                                        goals.reduce((acc, g) => acc + g.progress, 0) /
                                        goals.length,
                                    )
                                    : 0}
                                %
                            </p>
                            <p className="text-xs text-muted-foreground">Avg Progress</p>
                        </div>
                    </div>
                </div>

                {/* Active Goals Grid */}
                <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                    <h2 className="text-xl font-semibold mb-4">Active Goals</h2>
                    {activeGoals.length === 0 ? (
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 border border-gray-200/50 dark:border-gray-700/50 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <span className="text-3xl">🎯</span>
                            </div>
                            <p className="text-muted-foreground mb-4">
                                No active goals yet. Start your journey!
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Create Your First Goal
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeGoals.map((goal, idx) => (
                                <div
                                    key={goal.id}
                                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-200 animate-slide-up"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                                                {goal.title}
                                            </h3>
                                            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 capitalize">
                                                {goal.category}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleToggleStatus(goal.id, goal.status)
                                            }
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            aria-label={
                                                goal.status === "active" ? "Pause goal" : "Resume goal"
                                            }
                                        >
                                            {goal.status === "active" ? (
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <title>Pause</title>
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M10 9v6m4-6v6"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <title>Play</title>
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M14.752 11.168l-5.197-3.02A1 1 0 008 9.006v5.988a1 1 0 001.555.832l5.197-3.02a1 1 0 000-1.664z"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </div>

                                    {goal.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                            {goal.description}
                                        </p>
                                    )}

                                    {/* Progress bar */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">{goal.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-linear-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                                style={{ width: `${goal.progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {goal.deadline && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <title>Calendar</title>
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            {new Date(goal.deadline).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </div>
                                    )}

                                    {/* Milestones count */}
                                    {goal.milestones.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-xs text-muted-foreground">
                                                {goal.milestones.filter((m) => m.completed).length} /{" "}
                                                {goal.milestones.length} milestones completed
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Completed Goals */}
                {completedGoals.length > 0 && (
                    <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
                        <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                            Completed Goals 🎉
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {completedGoals.map((goal) => (
                                <div
                                    key={goal.id}
                                    className="bg-green-50/60 dark:bg-green-900/20 backdrop-blur-sm rounded-xl p-5 border border-green-200/50 dark:border-green-700/50"
                                >
                                    <h3 className="font-semibold mb-1">{goal.title}</h3>
                                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 capitalize">
                                        {goal.category}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Goal Modal */}
            <GoalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateGoal}
            />
        </div>
    );
}
