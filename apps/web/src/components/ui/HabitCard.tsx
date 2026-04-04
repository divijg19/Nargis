"use client";

import { Flame } from "lucide-react";
import type { Habit } from "@/types";
import { cn } from "@/utils";

export interface HabitCardProps {
  habit: Habit;
  days: string[];
  onLogToday: (habitId: string, count: number) => void;
  isLogging?: boolean;
}

function toDayKey(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function completionSet(habit: Habit): Set<string> {
  const set = new Set<string>();

  for (const entry of habit.history || []) {
    if (entry.completed || entry.count >= habit.target) {
      set.add(entry.date);
    }
  }

  return set;
}

function currentStreak(set: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (set.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function HabitCard({
  habit,
  days,
  onLogToday,
  isLogging = false,
}: HabitCardProps) {
  const completed = completionSet(habit);
  const todayKey = toDayKey(new Date());
  const todayEntry = habit.history?.find((entry) => entry.date === todayKey);
  const todayCount = todayEntry?.count ?? 0;
  const isCompletedToday =
    completed.has(todayKey) || todayCount >= habit.target;
  const streak = currentStreak(completed);

  return (
    <article className="rounded-2xl border border-border/40 bg-card p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: habit.color }}
            />
            <h3 className="truncate text-base font-semibold text-foreground">
              {habit.name}
            </h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Target: {habit.target} {habit.unit}
          </p>
        </div>

        <div className="w-full md:max-w-[20rem]">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => {
              const done = completed.has(day);
              return (
                <div
                  key={day}
                  className={cn(
                    "h-4 w-4 rounded-sm border border-border/30",
                    done ? "bg-emerald-500" : "bg-gray-100 dark:bg-gray-800",
                  )}
                  title={`${day}${done ? " - completed" : " - not completed"}`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <Flame className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-semibold">{streak}</span>
          </div>

          <button
            type="button"
            onClick={() => onLogToday(habit.id, habit.target)}
            disabled={isLogging || isCompletedToday}
            className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 dark:hover:text-emerald-200"
            aria-label={`Log ${habit.name} for today`}
          >
            {isCompletedToday ? "[Logged]" : "[Log Today]"}
          </button>

          <span className="text-sm text-muted-foreground">
            {todayCount}/{habit.target} {habit.unit}
          </span>
        </div>
      </div>
    </article>
  );
}
