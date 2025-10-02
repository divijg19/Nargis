import { CheckIcon } from "@heroicons/react/24/outline";
import type { HabitPreviewProps } from "@/types";
import { cn } from "@/utils";

/**
 * Habit preview component for displaying habit lists
 * Converted from Vue HabitPreview.vue
 */
export function HabitPreview({
  habits,
  limit = 5,
  onUpdateHabit,
}: HabitPreviewProps) {
  const displayHabits = habits.slice(0, limit);

  if (displayHabits.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <p>No habits yet</p>
      </div>
    );
  }

  const isCompletedToday = (habit: {
    id: string;
    history?: Array<{ date: string; completed: boolean }>;
  }): boolean => {
    // Check if habit has today's entry and is completed
    const today = new Date().toISOString().split("T")[0];
    const todayEntry = habit.history?.find((entry) => entry.date === today);
    return todayEntry?.completed || false;
  };

  return (
    <div className="space-y-3">
      {displayHabits.map((habit) => (
        <div
          key={habit.id}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{habit.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {habit.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {habit.streak || 0} day streak
              </p>
            </div>
          </div>
          <button
            type="button"
            className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-200",
              isCompletedToday(habit)
                ? "bg-green-500 border-green-500 text-white"
                : "border-gray-300 dark:border-gray-600 hover:border-green-500",
            )}
            onClick={() => onUpdateHabit(habit.id, 1)}
          >
            {isCompletedToday(habit) && <CheckIcon className="w-4 h-4" />}
          </button>
        </div>
      ))}

      {habits.length > limit && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            +{habits.length - limit} more habits
          </p>
        </div>
      )}
    </div>
  );
}
