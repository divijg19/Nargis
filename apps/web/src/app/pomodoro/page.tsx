"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { usePomodoroSessions } from "@/hooks/queries";
import { recordSession } from "@/services/endpoints/pomodoro";
import type { PomodoroSession } from "@/types";

function toDayKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatSessionTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PomodoroPage() {
  const queryClient = useQueryClient();
  const sessionsQuery = usePomodoroSessions();
  const sessions = sessionsQuery.data ?? [];

  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [todayKey, setTodayKey] = useState("");

  const completeGuardRef = useRef(false);

  const saveSessionMutation = useMutation({
    mutationFn: recordSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["pomodoro", "sessions"],
      });
    },
  });

  useEffect(() => {
    if (startedAt) return;
    setRemainingSeconds(durationMinutes * 60);
  }, [durationMinutes, startedAt]);

  useEffect(() => {
    setTodayKey(toDayKey(new Date()));
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const timerId = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isRunning]);

  const persistSession = useCallback(
    async (completed: boolean) => {
      if (!startedAt) {
        setIsRunning(false);
        setRemainingSeconds(durationMinutes * 60);
        return;
      }

      const elapsedSeconds = Math.max(
        0,
        durationMinutes * 60 - remainingSeconds,
      );
      const elapsedMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));

      try {
        await saveSessionMutation.mutateAsync({
          type: "work",
          duration: elapsedMinutes,
          startTime: startedAt,
          endTime: new Date(),
          completed,
        });
      } finally {
        setIsRunning(false);
        setStartedAt(null);
        setRemainingSeconds(durationMinutes * 60);
        completeGuardRef.current = false;
      }
    },
    [durationMinutes, remainingSeconds, saveSessionMutation, startedAt],
  );

  useEffect(() => {
    if (remainingSeconds !== 0 || !startedAt || completeGuardRef.current)
      return;

    completeGuardRef.current = true;
    void persistSession(true);
  }, [persistSession, remainingSeconds, startedAt]);

  const startTimer = () => {
    if (!startedAt) {
      setStartedAt(new Date());
    }
    completeGuardRef.current = false;
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopTimer = () => {
    void persistSession(false);
  };

  const todaysSessions = useMemo(() => {
    return sessions
      .filter((session) => toDayKey(new Date(session.startTime)) === todayKey)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [sessions, todayKey]);

  const totalFocusedMinutes = useMemo(
    () =>
      todaysSessions
        .filter((session) => session.type === "work")
        .reduce((total, session) => total + session.duration, 0),
    [todaysSessions],
  );

  const progress = useMemo(() => {
    const totalSeconds = durationMinutes * 60;
    if (totalSeconds <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds));
  }, [durationMinutes, remainingSeconds]);

  const ringRadius = 108;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progress);

  if (sessionsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-sky-600" />
          <p className="text-muted-foreground">Loading focus sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
      <PageCanvas className="max-w-240 gap-10 pb-16 pt-10">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
            Focus
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            A quiet timer for deep work, with automatic session logging.
          </p>
        </header>

        <section className="rounded-3xl border border-border/35 bg-card/95 px-6 py-10 shadow-sm">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-7">
            <div className="relative grid h-64 w-64 place-items-center sm:h-72 sm:w-72">
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 260 260"
                aria-hidden="true"
              >
                <circle
                  cx="130"
                  cy="130"
                  r={ringRadius}
                  className="fill-none stroke-border/50"
                  strokeWidth="8"
                />
                <circle
                  cx="130"
                  cy="130"
                  r={ringRadius}
                  className="fill-none stroke-sky-500 transition-all duration-500"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>

              <div className="text-center">
                <p className="font-mono text-6xl font-semibold tracking-tight text-foreground sm:text-7xl">
                  {formatClock(remainingSeconds)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {isRunning ? "In Focus" : startedAt ? "Paused" : "Ready"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {[15, 25, 50].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  disabled={Boolean(startedAt)}
                  onClick={() => setDurationMinutes(minutes)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-all duration-200 ${
                    durationMinutes === minutes
                      ? "bg-sky-600 text-white"
                      : "bg-muted/60 text-foreground hover:bg-muted"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {minutes}m
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 text-sm font-medium">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={startTimer}
                  className="text-sky-700 transition-colors duration-200 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  [Start]
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseTimer}
                  className="text-amber-700 transition-colors duration-200 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                >
                  [Pause]
                </button>
              )}

              <button
                type="button"
                disabled={!startedAt || saveSessionMutation.isPending}
                onClick={stopTimer}
                className="text-rose-700 transition-colors duration-200 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300 dark:hover:text-rose-200"
              >
                [Stop]
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/35 bg-card px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-foreground">
              Today's Focus Sessions
            </h2>
            <p className="text-sm text-muted-foreground">
              {totalFocusedMinutes} focused minute
              {totalFocusedMinutes === 1 ? "" : "s"}
            </p>
          </div>

          {todaysSessions.length === 0 ? (
            <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              No sessions logged today yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {todaysSessions.map((session: PomodoroSession) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between rounded-xl bg-muted/35 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {session.type === "work" ? "Focus Session" : "Break"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started at {formatSessionTime(session.startTime)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {session.duration} min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.completed ? "Completed" : "Stopped"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageCanvas>
    </div>
  );
}
