"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { HabitCard } from "@/components/ui/HabitCard";
import { useHabits } from "@/hooks/queries";
import { updateHabitCount } from "@/services/endpoints/habits";

function toDayKey(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const habitsQuery = useHabits();
  const habits = habitsQuery.data ?? [];

  const updateCountMutation = useMutation({
    mutationFn: ({ id, count }: { id: string; count: number }) =>
      updateHabitCount(id, count),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const days = useMemo(() => {
    const items: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 13; offset >= 0; offset -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - offset);
      items.push(toDayKey(day));
    }

    return items;
  }, []);

  const todayKey = useMemo(() => toDayKey(new Date()), []);

  const completedToday = useMemo(
    () =>
      habits.filter((habit) => {
        const todayEntry = habit.history?.find(
          (entry) => entry.date === todayKey,
        );
        if (!todayEntry) return false;
        return todayEntry.completed || todayEntry.count >= habit.target;
      }).length,
    [habits, todayKey],
  );

  if (habitsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-muted-foreground">Loading habits...</p>
        </div>
      </div>
    );
  }

  if (habitsQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Could not load habits right now.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
      <PageCanvas className="gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
            Habits
          </h1>
          <p className="text-base text-muted-foreground">
            Low-cognitive daily tracking with a 14-day completion heatmap.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border/35 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Habits
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {habits.length}
            </p>
          </div>
          <div className="rounded-xl border border-border/35 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Logged Today
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {completedToday}
            </p>
          </div>
        </section>

        {habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/70 px-4 py-16 text-center text-muted-foreground">
            No habits yet. Create one from voice or the assistant and it will
            appear here automatically.
          </div>
        ) : (
          <section className="space-y-4">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                days={days}
                isLogging={updateCountMutation.isPending}
                onLogToday={(habitId, count) => {
                  updateCountMutation.mutate({ id: habitId, count });
                }}
              />
            ))}
          </section>
        )}
      </PageCanvas>
    </div>
  );
}
