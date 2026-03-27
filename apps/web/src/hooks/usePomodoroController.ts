"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePomodoroSessions } from "@/hooks/queries";
import { recordSession } from "@/services/endpoints/pomodoro";
import type { PomodoroSession, PomodoroSettings } from "@/types";

type SessionType = "work" | "shortBreak" | "longBreak";

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getDurationMinutes(type: SessionType, settings: PomodoroSettings) {
  if (type === "shortBreak") return settings.shortBreakDuration;
  if (type === "longBreak") return settings.longBreakDuration;
  return settings.workDuration;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function usePomodoroController() {
  const queryClient = useQueryClient();
  const sessionsQuery = usePomodoroSessions();
  const sessions = sessionsQuery.data ?? [];

  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("work");
  const [currentCycle, setCurrentCycle] = useState(1);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(
    null,
  );
  const [timeRemaining, setTimeRemaining] = useState(
    DEFAULT_SETTINGS.workDuration * 60,
  );
  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    setTodayKey(dayKey(new Date()));
  }, []);

  const persistSessionMutation = useMutation({
    mutationFn: recordSession,
    onSuccess: (saved) => {
      queryClient.setQueryData<PomodoroSession[]>(
        ["pomodoro", "sessions"],
        (current = []) => [...current, saved],
      );
    },
  });

  const completeCurrentSession = useCallback(async () => {
    if (!currentSession) return;

    const completedSession: PomodoroSession = {
      ...currentSession,
      endTime: new Date(),
      completed: true,
    };

    try {
      await persistSessionMutation.mutateAsync({
        type: completedSession.type,
        duration: completedSession.duration,
        startTime: completedSession.startTime,
        endTime: completedSession.endTime,
        completed: true,
        taskId: completedSession.taskId,
      });
    } catch {
      // Keep timer resilient even when session persistence is temporarily unavailable.
    }

    const interval = Math.max(1, settings.longBreakInterval);
    const nextCycle = sessionType === "work" ? currentCycle + 1 : currentCycle;
    const nextType: SessionType =
      sessionType === "work"
        ? nextCycle % interval === 0
          ? "longBreak"
          : "shortBreak"
        : "work";
    const nextDurationMinutes = getDurationMinutes(nextType, settings);

    const autoStart =
      (nextType !== "work" && settings.autoStartBreaks) ||
      (nextType === "work" && settings.autoStartWork);

    if (autoStart) {
      const nextSession: PomodoroSession = {
        id: `session-${Date.now()}`,
        type: nextType,
        duration: nextDurationMinutes,
        startTime: new Date(),
        completed: false,
      };
      setCurrentSession(nextSession);
      setSessionType(nextType);
      setCurrentCycle(nextCycle);
      setTimeRemaining(nextDurationMinutes * 60);
      setIsRunning(true);
      return;
    }

    setCurrentSession(null);
    setSessionType(nextType);
    setCurrentCycle(nextCycle);
    setTimeRemaining(nextDurationMinutes * 60);
    setIsRunning(false);
  }, [
    currentSession,
    currentCycle,
    persistSessionMutation,
    sessionType,
    settings,
  ]);

  useEffect(() => {
    if (!isRunning || !currentSession) return;

    const timer = setInterval(() => {
      setTimeRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRunning, currentSession]);

  useEffect(() => {
    if (!isRunning || timeRemaining > 0) return;
    void completeCurrentSession();
  }, [isRunning, timeRemaining, completeCurrentSession]);

  const startTimer = useCallback(
    (type?: SessionType) => {
      const nextType = type ?? sessionType;
      const durationMinutes = getDurationMinutes(nextType, settings);

      if (!currentSession || currentSession.type !== nextType) {
        setCurrentSession({
          id: `session-${Date.now()}`,
          type: nextType,
          duration: durationMinutes,
          startTime: new Date(),
          completed: false,
        });
        setSessionType(nextType);
        setTimeRemaining(durationMinutes * 60);
      }

      setIsRunning(true);
    },
    [currentSession, sessionType, settings],
  );

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentSession(null);
    setTimeRemaining(getDurationMinutes(sessionType, settings) * 60);
  }, [sessionType, settings]);

  const updateSettings = useCallback(
    (next: PomodoroSettings) => {
      setSettings(next);
      if (!currentSession) {
        setTimeRemaining(getDurationMinutes(sessionType, next) * 60);
      }
    },
    [currentSession, sessionType],
  );

  const todaySessionsCount = useMemo(() => {
    if (!todayKey) return 0;
    return sessions.filter((session) => {
      if (!session.completed) return false;
      return dayKey(new Date(session.startTime)) === todayKey;
    }).length;
  }, [sessions, todayKey]);

  const progress = useMemo(() => {
    const totalDurationSeconds = currentSession
      ? currentSession.duration * 60
      : getDurationMinutes(sessionType, settings) * 60;

    if (totalDurationSeconds <= 0) return 0;
    const elapsed = totalDurationSeconds - timeRemaining;
    return Math.max(0, Math.min(100, (elapsed / totalDurationSeconds) * 100));
  }, [currentSession, sessionType, settings, timeRemaining]);

  const loadSessions = useCallback(async () => {
    const result = await sessionsQuery.refetch();
    return result.data ?? [];
  }, [sessionsQuery]);

  return {
    isRunning,
    currentSession,
    sessions,
    settings,
    timeRemaining,
    currentCycle,
    todaySessionsCount,
    sessionType,
    progress,
    formattedTime: formatTime(timeRemaining),
    startTimer,
    pauseTimer,
    resetTimer,
    updateSettings,
    loadSessions,
    isLoading: sessionsQuery.isLoading,
  };
}
