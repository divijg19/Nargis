import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { listHabits } from "@/services/endpoints/habits";
import {
  getLatestBriefing,
  listJournalEntries,
} from "@/services/endpoints/journal";
import { listSessions } from "@/services/endpoints/pomodoro";
import { listTasks } from "@/services/endpoints/tasks";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: listTasks,
  });
}

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: listHabits,
  });
}

export function useJournalEntries() {
  return useQuery({
    queryKey: ["journal"],
    queryFn: listJournalEntries,
  });
}

export function useMorningBriefing() {
  return useQuery({
    queryKey: ["journal", "briefing"],
    queryFn: getLatestBriefing,
  });
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function usePomodoroSessions() {
  return useQuery({
    queryKey: ["pomodoro", "sessions"],
    queryFn: listSessions,
  });
}

export function useDashboard() {
  const tasksQuery = useTasks();
  const habitsQuery = useHabits();
  const sessionsQuery = usePomodoroSessions();
  const [todayKey, setTodayKey] = useState("");
  const [todayIso, setTodayIso] = useState("");

  useEffect(() => {
    const now = new Date();
    setTodayKey(dayKey(now));
    setTodayIso(now.toISOString().slice(0, 10));
  }, []);

  const tasks = tasksQuery.data ?? [];
  const habits = habitsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const todayTasks = useMemo(() => {
    if (!todayKey) return [];
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      return dayKey(task.dueDate) === todayKey;
    });
  }, [tasks, todayKey]);

  const completedToday = useMemo(
    () =>
      todayTasks.filter((task) => task.completed || task.status === "done")
        .length,
    [todayTasks],
  );

  const tasksByStatus = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === "todo"),
      inProgress: tasks.filter((task) => task.status === "inProgress"),
      done: tasks.filter((task) => task.status === "done"),
    }),
    [tasks],
  );

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

  const totalStreaks = useMemo(
    () =>
      habits.filter((habit) => (habit.currentStreak ?? habit.streak) > 0)
        .length,
    [habits],
  );

  const todaySessionsCount = useMemo(() => {
    if (!todayKey) return 0;
    return sessions.filter((session) => {
      if (!session.completed) return false;
      return dayKey(new Date(session.startTime)) === todayKey;
    }).length;
  }, [sessions, todayKey]);

  const isLoading =
    tasksQuery.isLoading || habitsQuery.isLoading || sessionsQuery.isLoading;

  return {
    isLoading,
    tasks,
    habits,
    sessions,
    todayTasks,
    completedToday,
    tasksByStatus,
    todayProgress,
    totalStreaks,
    todaySessionsCount,
    refetch: async () => {
      await Promise.all([
        tasksQuery.refetch(),
        habitsQuery.refetch(),
        sessionsQuery.refetch(),
      ]);
    },
  };
}
