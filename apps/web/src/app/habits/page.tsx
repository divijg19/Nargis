"use client";

import { useEffect } from "react";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { useHabitStore } from "@/contexts/HabitContext";

export default function HabitsPage() {
    const { todayProgress, totalStreaks, loadHabits } = useHabitStore();

    useEffect(() => {
        loadHabits();
    }, [loadHabits]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <h1 className="text-3xl font-bold mb-2">Habits</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Track and reinforce consistent behaviors.
            </p>
            <DashboardCard
                title="Today"
                headerAction={
                    <span className="text-sm text-gray-500">Streaks: {totalStreaks}</span>
                }
            >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {todayProgress.map((habit) => (
                        <div
                            key={habit.id}
                            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-lg" aria-hidden>
                                    {habit.icon}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {habit.progress}%
                                </span>
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                                {habit.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {habit.todayCount}/{habit.target} {habit.unit}
                            </p>
                        </div>
                    ))}
                    {todayProgress.length === 0 && (
                        <p className="col-span-full text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                            No habits yet
                        </p>
                    )}
                </div>
            </DashboardCard>
        </div>
    );
}
