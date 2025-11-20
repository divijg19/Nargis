"use client";

import { useState } from "react";
import type { Habit } from "@/types";
import { cn } from "@/utils";

export interface HabitCardProps {
  habit: Habit & {
    todayCount?: number;
    progress?: number;
    completed?: boolean;
  };
  onUpdateCount: (habitId: string, count: number) => void;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function HabitCard({
  habit,
  onUpdateCount,
  onEdit,
  onDelete,
  showActions = false,
  compact = false,
}: HabitCardProps) {
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const todayCount = habit.todayCount || 0;
  const progress = habit.progress || 0;
  const completed = habit.completed || false;

  const handleIncrement = () => {
    const newCount = Math.min(todayCount + 1, habit.target);
    onUpdateCount(habit.id, newCount);
  };

  const handleDecrement = () => {
    const newCount = Math.max(todayCount - 1, 0);
    onUpdateCount(habit.id, newCount);
  };

  const handleToggleComplete = () => {
    if (completed) {
      onUpdateCount(habit.id, 0);
    } else {
      onUpdateCount(habit.id, habit.target);
    }
  };

  if (compact) {
    return (
      <div
        className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm"
        style={{
          borderLeft: `4px solid ${habit.color}`,
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleToggleComplete}
            className={cn(
              "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
              completed
                ? "border-green-500 bg-green-500"
                : "border-gray-300 dark:border-gray-600 hover:border-primary",
            )}
            aria-label={
              completed
                ? `Mark ${habit.name} incomplete`
                : `Complete ${habit.name}`
            }
          >
            {completed && (
              <svg
                className="w-3 h-3 text-white"
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
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">{habit.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{habit.name}</p>
              {habit.streak > 0 && (
                <p className="text-xs text-muted-foreground">
                  🔥 {habit.streak} day{habit.streak !== 1 ? "s" : ""} streak
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {todayCount}/{habit.target} {habit.unit}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 transition-all duration-200 hover:shadow-lg hover-elevate"
      style={{
        borderTop: `4px solid ${habit.color}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl shadow-sm"
            style={{ backgroundColor: `${habit.color}20` }}
          >
            {habit.icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{habit.name}</h3>
            <p className="text-sm text-muted-foreground">
              {habit.frequency === "daily" ? "Daily" : "Weekly"} •{" "}
              {habit.target} {habit.unit}
            </p>
          </div>
        </div>

        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(habit)}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                aria-label={`Edit ${habit.name}`}
              >
                <svg
                  className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <title>Edit</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (deletingHabitId === habit.id) {
                    onDelete(habit.id);
                    setDeletingHabitId(null);
                  } else {
                    setDeletingHabitId(habit.id);
                    setTimeout(() => setDeletingHabitId(null), 3000);
                  }
                }}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  deletingHabitId === habit.id
                    ? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50"
                    : "hover:bg-red-100 dark:hover:bg-red-900/30",
                )}
                aria-label={
                  deletingHabitId === habit.id
                    ? `Confirm delete ${habit.name}`
                    : `Delete ${habit.name}`
                }
              >
                <svg
                  className={cn(
                    "w-4 h-4 transition-colors",
                    deletingHabitId === habit.id
                      ? "text-red-700 dark:text-red-300"
                      : "text-red-600 dark:text-red-400",
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <title>
                    {deletingHabitId === habit.id ? "Confirm delete" : "Delete"}
                  </title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      deletingHabitId === habit.id
                        ? "M5 13l4 4L19 7"
                        : "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    }
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">
            {todayCount}/{habit.target} {habit.unit}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: habit.color,
            }}
          />
        </div>
      </div>

      {/* Counter Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={todayCount === 0}
          className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label={`Decrease ${habit.name} count`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Decrease</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold" style={{ color: habit.color }}>
            {todayCount}
          </span>
          <span className="text-xs text-muted-foreground">
            {habit.unit} today
          </span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={todayCount >= habit.target}
          className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label={`Increase ${habit.name} count`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Increase</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Streak */}
      {habit.streak > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <span className="text-xl">🔥</span>
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {habit.streak} day{habit.streak !== 1 ? "s" : ""} streak!
          </span>
        </div>
      )}

      {/* Completion Badge */}
      {completed && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <title>Completed</title>
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
