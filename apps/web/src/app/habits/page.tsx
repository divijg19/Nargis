"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import HabitModal from "@/components/ui/HabitModal";
import { useHabitStore } from "@/contexts/HabitContext";
import type { CreateHabitRequest } from "@/types";

export default function HabitsPage() {
  const {
    todayProgress,
    totalStreaks,
    loadHabits,
    addHabit,
    updateHabitCount,
  } = useHabitStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const handleCreateHabit = (habitData: CreateHabitRequest) => {
    addHabit(habitData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-orange-950/20 transition-all duration-500">
      {/* Premium ambient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/5 to-transparent dark:via-orange-400/10 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 py-4">
        {/* Premium Header */}
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-3">
                <span className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
                  Habits
                </span>
                <span className="text-slate-900 dark:text-white"> 🔥</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300">
                Build consistency, one day at a time
              </p>
            </div>
            <ActionButton
              icon="➕"
              label="New Habit"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            />
          </div>

          {/* Premium Streak Badge */}
          <div className="inline-flex items-center px-6 py-3 rounded-2xl glass bg-gradient-to-br from-orange-50/90 to-red-50/90 dark:from-orange-900/20 dark:to-red-900/20 backdrop-blur-xl border border-orange-200/60 dark:border-orange-800/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-scale-in">
            <span className="text-3xl mr-3" aria-hidden="true">
              🔥
            </span>
            <span className="text-base font-semibold text-orange-900 dark:text-orange-200">
              {totalStreaks} Active Streak{totalStreaks !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Habits Grid */}
        <DashboardCard title="Today's Progress">
          {todayProgress.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <span className="text-4xl" aria-hidden="true">
                  🎯
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
                No habits yet
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                Create your first habit to start building consistency
              </p>
              <ActionButton
                icon="➕"
                label="Create Your First Habit"
                variant="primary"
                onClick={() => setIsModalOpen(true)}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todayProgress.map((habit, index) => {
                const progressPercent = habit.progress;
                const isComplete = progressPercent >= 100;

                return (
                  <div
                    key={habit.id}
                    className="group relative p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg animate-scale-in"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      borderColor: isComplete
                        ? "rgb(34, 197, 94)"
                        : "rgb(229, 231, 235)",
                      backgroundColor: isComplete
                        ? "rgb(240, 253, 244)"
                        : "white",
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl" aria-hidden="true">
                          {habit.icon}
                        </span>
                        {isComplete && (
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          isComplete
                            ? "bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {progressPercent}%
                      </span>
                    </div>

                    {/* Habit Name */}
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-2">
                      {habit.name}
                    </h3>

                    {/* Progress Info */}
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-600 dark:text-gray-400">
                        {habit.todayCount} / {habit.target} {habit.unit}
                      </span>
                      <button
                        type="button"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                        onClick={() =>
                          updateHabitCount(habit.id, habit.todayCount + 1)
                        }
                      >
                        + Add
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isComplete ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Habit Creation Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateHabit}
      />
    </div>
  );
}
