"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
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
    <RequireAuth>
      <div className="h-full overflow-hidden flex flex-col bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
        <div className="w-full max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 space-y-6 py-4 flex-1 min-h-0 overflow-hidden">
          {/* Premium Header */}
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-semibold mb-2 text-foreground">
                  Habits
                </h1>
                <p className="text-base text-muted-foreground">
                  Build consistency, one day at a time
                </p>
              </div>
              <ActionButton
                label="New Habit"
                variant="primary"
                onClick={() => setIsModalOpen(true)}
              />
            </div>

            {/* Streak badge moved into the Today's Progress column */}
          </div>

          {/* Split layout: Today's Progress (vertical list) beside Activity Heatmap (squarish) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 h-full overflow-auto pr-1">
            {/* Left: Today's Progress - single vertical column with streak badge to the left on large screens */}
            <div className="lg:col-span-5">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="shrink-0 lg:-ml-28 lg:mr-8">
                  <div className="inline-flex items-center px-3 sm:px-4 py-2 rounded-xl border border-border/25 bg-card transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200">
                    <span className="text-sm font-medium text-foreground">
                      {totalStreaks} Active Streak
                      {totalStreaks !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <DashboardCard title="Today's Progress">
                    {todayProgress.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                          <span
                            className="text-sm text-muted-foreground"
                            aria-hidden="true"
                          >
                            None
                          </span>
                        </div>
                        <p className="text-lg font-medium text-muted-foreground mb-2">
                          No habits yet
                        </p>
                        <p className="text-sm text-muted-foreground mb-6">
                          Create your first habit to start building consistency
                        </p>
                        <ActionButton
                          label="Create Your First Habit"
                          variant="primary"
                          onClick={() => setIsModalOpen(true)}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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
                  <div className="w-full max-w-90 sm:max-w-105 max-h-90 sm:max-h-105 overflow-auto">
                    <Heatmap habits={habits || []} weeks={14} />
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
    </RequireAuth>
  );
}
