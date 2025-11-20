"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { HabitCard } from "@/components/ui/HabitCard";
import HabitModal from "@/components/ui/HabitModal";
import Heatmap from "@/components/ui/Heatmap";
import { useHabitStore } from "@/contexts/HabitContext";
import type { CreateHabitRequest, Habit } from "@/types";

export default function HabitsPage() {
  const {
    todayProgress,
    totalStreaks,
    loadHabits,
    addHabit,
    updateHabit,
    deleteHabit,
    updateHabitCount,
    habits,
  } = useHabitStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const handleCreateHabit = (habitData: CreateHabitRequest) => {
    if (editingHabit) {
      // Update existing habit
      updateHabit({ id: editingHabit.id, ...habitData });
      setEditingHabit(null);
    } else {
      // Create new habit
      addHabit(habitData);
    }
    setIsModalOpen(false);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  return (
    <div className="min-h-screen pt-24 md:pt-28 bg-app-light transition-all duration-500">
      {/* Premium ambient overlay */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-orange-500/5 to-transparent dark:via-orange-400/10 pointer-events-none" />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 py-4">
        {/* Premium Header */}
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-3">
                <span className="bg-linear-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
                  Habits
                </span>
                <span className="text-foreground dark:text-white"> 🔥</span>
              </h1>
              <p className="text-xl text-muted-foreground dark:text-slate-300">
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

          {/* Streak badge moved into the Today's Progress column */}
        </div>

        {/* Split layout: Today's Progress (vertical list) beside Activity Heatmap (squarish) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left: Today's Progress - single vertical column with streak badge to the left on large screens */}
          <div className="lg:col-span-5">
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              <div className="shrink-0 lg:-ml-28 lg:mr-8">
                <div className="inline-flex items-center px-4 py-2 rounded-xl glass bg-linear-to-br from-orange-50/90 to-red-50/90 dark:from-orange-900/20 dark:to-red-900/20 backdrop-blur-xl border border-orange-200/60 dark:border-orange-800/60 shadow-lg transition-all duration-300 animate-scale-in">
                  <span className="text-2xl mr-2" aria-hidden="true">
                    🔥
                  </span>
                  <span className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                    {totalStreaks} Active Streak{totalStreaks !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <DashboardCard title="Today's Progress">
                  {todayProgress.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                        <span className="text-4xl" aria-hidden="true">
                          🎯
                        </span>
                      </div>
                      <p className="text-lg font-medium text-muted-foreground mb-2">
                        No habits yet
                      </p>
                      <p className="text-sm text-muted-foreground mb-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {todayProgress.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          onUpdateCount={updateHabitCount}
                          onEdit={handleEditHabit}
                          onDelete={handleDeleteHabit}
                          showActions={true}
                        />
                      ))}
                    </div>
                  )}
                </DashboardCard>
              </div>
            </div>
          </div>

          {/* Right: Activity heatmap large squarish card */}
          <div className="lg:col-span-7 flex items-stretch">
            <DashboardCard title="Activity" className="w-full">
              <div className="w-full flex items-center justify-center">
                <div className="w-full max-w-[420px] max-h-[420px] overflow-auto">
                  <Heatmap habits={habits || []} weeks={16} />
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>

      {/* Habit Creation Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleCreateHabit}
        initialData={editingHabit || undefined}
      />
    </div>
  );
}
