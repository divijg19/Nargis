"use client";

import { useMemo } from "react";
import { useGoalStore } from "@/contexts/GoalContext";
import { useHabitStore } from "@/contexts/HabitContext";
import { usePomodoroStore } from "@/contexts/PomodoroContext";
import { useTaskStore } from "@/contexts/TaskContext";

interface AIOverviewProps {
    className?: string;
}

export function AIOverview({ className = "" }: AIOverviewProps) {
    const { todayTasks, completedToday } = useTaskStore();
    const { todayProgress } = useHabitStore();
    const { goals } = useGoalStore();
    const { todaySessionsCount, sessions } = usePomodoroStore();

    // Calculate total focus minutes from today's completed sessions
    const totalFocusMinutes = useMemo(() => {
        return sessions
            .filter((s) => s.completed && s.type === "work")
            .reduce((acc, s) => {
                const sessionDate = new Date(s.startTime);
                const today = new Date();
                sessionDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                if (sessionDate.getTime() === today.getTime()) {
                    return acc + s.duration;
                }
                return acc;
            }, 0);
    }, [sessions]);

    const insights = useMemo(() => {
        const insights: Array<{
            type: "success" | "warning" | "info" | "suggestion";
            text: string;
            icon: string;
        }> = [];

        // Task insights
        const incompleteTasks = todayTasks.filter((t) => !t.completed).length;
        const taskCompletionRate =
            todayTasks.length > 0
                ? Math.round((completedToday / todayTasks.length) * 100)
                : 0;

        if (completedToday > 0 && todayTasks.length === completedToday) {
            insights.push({
                type: "success",
                text: `Amazing! You've completed all ${completedToday} tasks today! 🎉`,
                icon: "✅",
            });
        } else if (incompleteTasks > 5) {
            insights.push({
                type: "warning",
                text: `You have ${incompleteTasks} tasks pending. Consider breaking them into smaller chunks.`,
                icon: "⚠️",
            });
        } else if (taskCompletionRate >= 70) {
            insights.push({
                type: "success",
                text: `Great progress! ${taskCompletionRate}% of your tasks are complete.`,
                icon: "📈",
            });
        }

        // Habit insights
        const completedHabits = todayProgress.filter((h) => h.completed).length;
        const habitCompletionRate =
            todayProgress.length > 0
                ? Math.round((completedHabits / todayProgress.length) * 100)
                : 0;

        if (todayProgress.length > 0 && habitCompletionRate === 100) {
            insights.push({
                type: "success",
                text: `Perfect! All ${todayProgress.length} habits completed today! Keep the streak going! 🔥`,
                icon: "⚡",
            });
        } else if (todayProgress.length > 0 && completedHabits === 0) {
            insights.push({
                type: "suggestion",
                text: "No habits completed yet today. Start with just one to build momentum!",
                icon: "🎯",
            });
        } else if (habitCompletionRate >= 50 && todayProgress.length > 0) {
            insights.push({
                type: "info",
                text: `${completedHabits}/${todayProgress.length} habits done. You're ${100 - habitCompletionRate}% away from a perfect day!`,
                icon: "🔥",
            });
        }

        // Focus session insights
        if (todaySessionsCount === 0 && incompleteTasks > 0) {
            insights.push({
                type: "suggestion",
                text: "Try a focus session to tackle your tasks with deep concentration.",
                icon: "🍅",
            });
        } else if (todaySessionsCount >= 4) {
            insights.push({
                type: "success",
                text: `Excellent focus today! ${todaySessionsCount} sessions completed (${totalFocusMinutes} minutes).`,
                icon: "🎯",
            });
        } else if (todaySessionsCount > 0) {
            insights.push({
                type: "info",
                text: `${todaySessionsCount} focus sessions done today. Keep the momentum!`,
                icon: "🍅",
            });
        }

        // Goal insights
        const activeGoals = goals.filter((g) => g.status === "active").length;
        if (activeGoals > 0 && incompleteTasks === 0) {
            insights.push({
                type: "suggestion",
                text: `You have ${activeGoals} active ${activeGoals === 1 ? "goal" : "goals"}. Ready to create tasks to move forward?`,
                icon: "🎯",
            });
        }

        // Energy level suggestion based on time
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 9 && incompleteTasks > 0) {
            insights.push({
                type: "info",
                text: "Morning is great for tackling your most important tasks when energy is high!",
                icon: "🌅",
            });
        } else if (hour >= 14 && hour < 16 && todaySessionsCount === 0) {
            insights.push({
                type: "suggestion",
                text: "Post-lunch is a good time for a focused work session.",
                icon: "☀️",
            });
        }

        // Default message if no insights
        if (insights.length === 0) {
            insights.push({
                type: "info",
                text: "Start your day by reviewing your tasks and setting your intentions.",
                icon: "🌟",
            });
        }

        // Limit to top 3 most relevant insights
        return insights.slice(0, 3);
    }, [
        todayTasks,
        completedToday,
        todayProgress,
        goals,
        todaySessionsCount,
        totalFocusMinutes,
    ]);

    const summary = useMemo(() => {
        const parts: string[] = [];

        if (todayTasks.length > 0) {
            parts.push(
                `${completedToday}/${todayTasks.length} ${todayTasks.length === 1 ? "task" : "tasks"}`,
            );
        }

        if (todayProgress.length > 0) {
            const completed = todayProgress.filter((h) => h.completed).length;
            parts.push(
                `${completed}/${todayProgress.length} ${todayProgress.length === 1 ? "habit" : "habits"}`,
            );
        }

        if (todaySessionsCount > 0) {
            parts.push(
                `${todaySessionsCount} focus ${todaySessionsCount === 1 ? "session" : "sessions"}`,
            );
        }

        return parts.length > 0
            ? `Today: ${parts.join(" • ")}`
            : "No activity yet today";
    }, [todayTasks, completedToday, todayProgress, todaySessionsCount]);

    const getInsightColors = (
        type: "success" | "warning" | "info" | "suggestion",
    ) => {
        switch (type) {
            case "success":
                return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200";
            case "warning":
                return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200";
            case "info":
                return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
            case "suggestion":
                return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200";
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Summary Header */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
                <div className="text-2xl shrink-0" aria-hidden="true">
                    ✨
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">
                        AI Overview
                    </h3>
                    <p className="text-xs text-muted-foreground">{summary}</p>
                </div>
            </div>

            {/* Insights */}
            <div className="space-y-2">
                {insights.map((insight, index) => (
                    <div
                        key={`${insight.type}-${index}`}
                        className={`p-3 rounded-lg border transition-all hover:shadow-md ${getInsightColors(insight.type)}`}
                    >
                        <div className="flex items-start gap-2">
                            <span className="text-base shrink-0" aria-hidden="true">
                                {insight.icon}
                            </span>
                            <p className="text-sm leading-relaxed">{insight.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
