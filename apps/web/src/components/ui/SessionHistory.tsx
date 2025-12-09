"use client";

import { useEffect, useMemo, useState } from "react";
import type { PomodoroSession } from "@/types";
import { cn } from "@/utils";

interface SessionHistoryProps {
  sessions: PomodoroSession[];
  className?: string;
  maxItems?: number;
}

export function SessionHistory({
  sessions,
  className,
  maxItems = 10,
}: SessionHistoryProps) {
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
  }, []);

  // Filter and sort sessions
  const sortedSessions = useMemo(() => {
    return sessions
      .filter((s) => s.completed)
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      )
      .slice(0, maxItems);
  }, [sessions, maxItems]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!today) {
      return {
        total: 0,
        workSessions: 0,
        todaySessions: 0,
        totalMinutes: 0,
        totalHours: 0,
      };
    }

    const completedSessions = sessions.filter((s) => s.completed);
    const workSessions = completedSessions.filter((s) => s.type === "work");

    const todaySessions = completedSessions.filter((s) => {
      const sessionDate = new Date(s.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    const totalMinutes = workSessions.reduce((sum, s) => sum + s.duration, 0);

    return {
      total: completedSessions.length,
      workSessions: workSessions.length,
      todaySessions: todaySessions.length,
      totalMinutes,
      totalHours: Math.floor(totalMinutes / 60),
    };
  }, [sessions, today]);

  const getSessionIcon = (type: PomodoroSession["type"]) => {
    switch (type) {
      case "work":
        return "🎯";
      case "shortBreak":
        return "☕";
      case "longBreak":
        return "🌟";
      default:
        return "⏱️";
    }
  };

  const getSessionLabel = (type: PomodoroSession["type"]) => {
    switch (type) {
      case "work":
        return "Focus";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
      default:
        return "Session";
    }
  };

  const getSessionColor = (type: PomodoroSession["type"]) => {
    switch (type) {
      case "work":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "shortBreak":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "longBreak":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const sessionDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() === today.getTime()) {
      return "Today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (sessionDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (sortedSessions.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm font-medium text-muted-foreground mb-1">
          No sessions yet
        </p>
        <p className="text-xs text-muted-foreground">
          Complete your first Pomodoro session to see history
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-muted-foreground mb-1">Today</div>
          <div className="text-2xl font-bold text-foreground">
            {stats.todaySessions}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-muted-foreground mb-1">Total Focus</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.workSessions}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-muted-foreground mb-1">Total Time</div>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalHours}
            <span className="text-sm font-normal text-muted-foreground">h</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-muted-foreground mb-1">All Sessions</div>
          <div className="text-2xl font-bold text-foreground">
            {stats.total}
          </div>
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Recent Sessions
        </h3>
        {sortedSessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md",
              getSessionColor(session.type),
            )}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="text-2xl" aria-hidden="true">
                {getSessionIcon(session.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {getSessionLabel(session.type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {session.duration} min
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(session.startTime)} at{" "}
                  {formatTime(session.startTime)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {session.endTime && (
                <div className="text-xs text-muted-foreground hidden sm:block">
                  Ended {formatTime(session.endTime)}
                </div>
              )}
              <div
                className="w-2 h-2 rounded-full bg-green-500"
                title="Completed"
              />
            </div>
          </div>
        ))}
      </div>

      {sessions.filter((s) => s.completed).length > maxItems && (
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {maxItems} of {sessions.filter((s) => s.completed).length}{" "}
            sessions
          </p>
        </div>
      )}
    </div>
  );
}
