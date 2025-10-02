"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { useToasts } from "@/contexts/ToastContext";
import { buildEvent, emitDomainEvent } from "@/events/dispatcher";
import {
  createHabit as apiCreateHabit,
  deleteHabit as apiDeleteHabit,
  updateHabit as apiUpdateHabit,
  updateHabitCount as apiUpdateHabitCount,
  listHabits,
} from "@/services/endpoints/habits";
import type {
  CreateHabitRequest,
  Habit,
  HabitEntry,
  HabitStore,
  UpdateHabitRequest,
} from "@/types";
import { generateId } from "@/utils";

// Action types
type HabitAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_HABITS"; payload: Habit[] }
  | { type: "ADD_HABIT"; payload: Habit }
  | { type: "UPDATE_HABIT"; payload: { id: string; updates: Partial<Habit> } }
  | { type: "DELETE_HABIT"; payload: string }
  | { type: "UPDATE_HABIT_COUNT"; payload: { id: string; count: number } };

// Initial state
const initialState: HabitStore = {
  habits: [],
  loading: false,
  todayProgress: [],
  totalStreaks: 0,
};

// Reducer function
function habitReducer(state: HabitStore, action: HabitAction): HabitStore {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_HABITS":
      return { ...state, habits: action.payload, loading: false };

    case "ADD_HABIT":
      return { ...state, habits: [...state.habits, action.payload] };

    case "UPDATE_HABIT": {
      const updatedHabits = state.habits.map((habit) =>
        habit.id === action.payload.id
          ? { ...habit, ...action.payload.updates }
          : habit,
      );
      return { ...state, habits: updatedHabits };
    }

    case "DELETE_HABIT": {
      const filteredHabits = state.habits.filter(
        (habit) => habit.id !== action.payload,
      );
      return { ...state, habits: filteredHabits };
    }

    case "UPDATE_HABIT_COUNT": {
      const today = new Date().toISOString().split("T")[0];
      const updatedHabits = state.habits.map((habit) => {
        if (habit.id === action.payload.id) {
          const existingEntryIndex = habit.history.findIndex(
            (entry) => entry.date === today,
          );
          const newCount = action.payload.count;
          const completed = newCount >= habit.target;

          const updatedHistory = [...habit.history];
          const newEntry: HabitEntry = {
            date: today,
            count: newCount,
            completed,
          };

          if (existingEntryIndex >= 0) {
            updatedHistory[existingEntryIndex] = newEntry;
          } else {
            updatedHistory.push(newEntry);
          }

          // Calculate streak
          const sortedHistory = updatedHistory
            .filter((entry) => entry.completed)
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );

          let streak = 0;
          const currentDate = new Date();
          for (const entry of sortedHistory) {
            const entryDate = new Date(entry.date);
            const daysDiff = Math.floor(
              (currentDate.getTime() - entryDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );

            if (daysDiff === streak) {
              streak++;
            } else {
              break;
            }
          }

          return {
            ...habit,
            history: updatedHistory,
            streak,
          };
        }
        return habit;
      });

      return { ...state, habits: updatedHabits };
    }

    default:
      return state;
  }
}

// Context type
interface HabitContextType extends HabitStore {
  addHabit: (habitData: CreateHabitRequest) => void;
  updateHabit: (updates: UpdateHabitRequest) => void;
  deleteHabit: (id: string) => void;
  updateHabitCount: (habitId: string, count: number) => void;
  loadHabits: () => Promise<void>;
}

// Create context
const HabitContext = createContext<HabitContextType | undefined>(undefined);

// Provider component
export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(habitReducer, initialState);
  const { push } = useToasts();

  // Computed values
  const todayProgress = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return state.habits.map((habit) => {
      const todayEntry = habit.history.find((entry) => entry.date === today);
      const progress = todayEntry ? (todayEntry.count / habit.target) * 100 : 0;
      return {
        ...habit,
        todayCount: todayEntry?.count || 0,
        progress: Math.min(progress, 100),
        completed: todayEntry?.completed || false,
      };
    });
  }, [state.habits]);

  const totalStreaks = useMemo(
    () => state.habits.reduce((total, habit) => total + habit.streak, 0),
    [state.habits],
  );

  // Actions
  const addHabit = async (habitData: CreateHabitRequest) => {
    try {
      const created = await apiCreateHabit(habitData);
      dispatch({ type: "ADD_HABIT", payload: created });
      emitDomainEvent(buildEvent("habit.created", { id: created.id }));
      push({ title: "Habit Added", message: created.name, variant: "success" });
    } catch {
      const newHabit: Habit = {
        ...habitData,
        id: generateId(),
        createdAt: new Date(),
        streak: 0,
        history: [],
      };
      dispatch({ type: "ADD_HABIT", payload: newHabit });
      emitDomainEvent(
        buildEvent("habit.created.optimistic", { id: newHabit.id }),
      );
      push({
        title: "Habit Added (Offline)",
        message: newHabit.name,
        variant: "info",
      });
    }
  };

  const updateHabit = async (updates: UpdateHabitRequest) => {
    dispatch({ type: "UPDATE_HABIT", payload: { id: updates.id, updates } });
    try {
      await apiUpdateHabit(updates.id, updates);
      emitDomainEvent(buildEvent("habit.updated", { id: updates.id }));
      push({
        title: "Habit Updated",
        message: "Changes saved",
        variant: "success",
      });
    } catch {
      /* noop */
      push({
        title: "Update Failed",
        message: "Will retry later",
        variant: "warning",
      });
    }
  };

  const deleteHabit = async (id: string) => {
    dispatch({ type: "DELETE_HABIT", payload: id });
    try {
      await apiDeleteHabit(id);
      emitDomainEvent(buildEvent("habit.deleted", { id }));
      push({ title: "Habit Deleted", message: id, variant: "info" });
    } catch {
      /* noop */
      push({ title: "Delete Failed", message: id, variant: "error" });
    }
  };

  const updateHabitCount = async (habitId: string, count: number) => {
    dispatch({ type: "UPDATE_HABIT_COUNT", payload: { id: habitId, count } });
    try {
      await apiUpdateHabitCount(habitId, count);
      emitDomainEvent(
        buildEvent("habit.count.updated", { id: habitId, count }),
      );
      push({
        title: "Progress",
        message: `Updated to ${count}`,
        variant: "info",
      });
    } catch {
      /* noop */
      push({
        title: "Update Failed",
        message: "Unable to sync count",
        variant: "warning",
      });
    }
  };

  const loadHabits = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const habits = await listHabits();
      dispatch({ type: "SET_HABITS", payload: habits });
      // Silent load - no toast notification to avoid spam
    } catch (error) {
      console.error("Failed to load habits:", error);
      dispatch({ type: "SET_LOADING", payload: false });
      push({
        title: "Sync Failed",
        message: "Could not load habits",
        variant: "error",
      });
    }
  }, [push]);

  const contextValue: HabitContextType = {
    ...state,
    todayProgress,
    totalStreaks,
    addHabit,
    updateHabit,
    deleteHabit,
    updateHabitCount,
    loadHabits,
  };

  return (
    <HabitContext.Provider value={contextValue}>
      {children}
    </HabitContext.Provider>
  );
}

// Hook to use the context
export function useHabitStore() {
  const context = useContext(HabitContext);
  if (context === undefined) {
    throw new Error("useHabitStore must be used within a HabitProvider");
  }
  return context;
}
