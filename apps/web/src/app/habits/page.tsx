"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { HabitCard } from "@/components/ui/HabitCard";
import HabitModal from "@/components/ui/HabitModal";
import Heatmap from "@/components/ui/Heatmap";
import { useHabits } from "@/hooks/queries";
import {
  createHabit,
  deleteHabit,
  updateHabit,
  updateHabitCount,
} from "@/services/endpoints/habits";
import type { CreateHabitRequest, Habit, UpdateHabitRequest } from "@/types";

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const habitsQuery = useHabits();
  const habits = habitsQuery.data ?? [];
  const [todayIso, setTodayIso] = useState("");

  useEffect(() => {
    setTodayIso(new Date().toISOString().slice(0, 10));
  }, []);

  const createMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateHabitRequest;
    }) => updateHabit(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const updateCountMutation = useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) =>
      updateHabitCount(id, count),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const todayProgress = useMemo(() => {
    if (!todayIso) return [];
    return habits.map((habit) => {
      const todayEntry = habit.history?.find(
        (entry) => entry.date === todayIso,
      );
      const todayCount = todayEntry?.count ?? 0;
      const progress = Math.min(
        100,
        Math.round((todayCount / habit.target) * 100),
      );
      const completed = todayCount >= habit.target;
      return {
        ...habit,
        todayCount,
        progress,
        completed,
      };
    });
  }, [habits, todayIso]);

  const totalStreaks = habits.filter(
    (habit) => (habit.currentStreak ?? habit.streak) > 0,
  ).length;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const handleCreateHabit = async (habitData: CreateHabitRequest) => {
    if (editingHabit) {
      await updateMutation.mutateAsync({
        id: editingHabit.id,
        payload: { id: editingHabit.id, ...habitData },
      });
      setEditingHabit(null);
    } else {
      await createMutation.mutateAsync(habitData);
    }
    setIsModalOpen(false);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteMutation.mutateAsync(habitId);
  };

  const handleUpdateHabitCount = async (habitId: string, count: number) => {
    await updateCountMutation.mutateAsync({ id: habitId, count });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  if (habitsQuery.isLoading) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading habits...</p>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
        <PageCanvas className="gap-8">
          <div className="animate-fade-in">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold text-foreground md:text-5xl">
                  Habits
                </h1>
                <p className="text-base text-muted-foreground">
                  Build consistency, one day at a time.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center rounded-xl border border-border/25 bg-card px-3 py-2">
                  <span className="text-sm font-medium text-foreground">
                    {totalStreaks} Active Streak{totalStreaks !== 1 ? "s" : ""}
                  </span>
                </div>
                <ActionButton
                  label="New Habit"
                  variant="primary"
                  onClick={() => setIsModalOpen(true)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)]">
            <DashboardCard title="Today's Progress">
              {todayProgress.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <span
                      className="text-sm text-muted-foreground"
                      aria-hidden="true"
                    >
                      None
                    </span>
                  </div>
                  <p className="mb-2 text-lg font-medium text-muted-foreground">
                    No habits yet
                  </p>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Create your first habit to start building consistency
                  </p>
                  <ActionButton
                    label="Create Your First Habit"
                    variant="primary"
                    onClick={() => setIsModalOpen(true)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {todayProgress.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onUpdateCount={handleUpdateHabitCount}
                      onEdit={handleEditHabit}
                      onDelete={handleDeleteHabit}
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </DashboardCard>

            <DashboardCard title="Activity" className="w-full">
              <div className="flex w-full items-center justify-center">
                <div className="w-full max-w-2xl overflow-auto">
                  <Heatmap habits={habits || []} weeks={14} />
                </div>
              </div>
            </DashboardCard>
          </div>
        </PageCanvas>

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
