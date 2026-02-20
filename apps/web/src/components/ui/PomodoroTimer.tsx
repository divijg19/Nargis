"use client";

import { usePomodoroStore } from "@/contexts/PomodoroContext";
import { cn } from "@/utils";

interface PomodoroTimerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showControls?: boolean;
  minimal?: boolean;
}

export function PomodoroTimer({
  className,
  size = "md",
  showControls = true,
  minimal = false,
}: PomodoroTimerProps) {
  const {
    formattedTime,
    progress,
    sessionType,
    isRunning,
    currentSession,
    startTimer,
    pauseTimer,
    resetTimer,
  } = usePomodoroStore();

  const sizeClasses = {
    sm: "text-4xl",
    md: "text-6xl",
    lg: "text-8xl",
  };

  const getSessionColor = () => {
    switch (sessionType) {
      case "work":
        return "text-blue-600 dark:text-blue-400";
      case "shortBreak":
        return "text-green-600 dark:text-green-400";
      case "longBreak":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-foreground";
    }
  };

  const getSessionLabel = () => {
    switch (sessionType) {
      case "work":
        return "Focus Time";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
      default:
        return "Ready";
    }
  };

  const getProgressColor = () => {
    switch (sessionType) {
      case "work":
        return "bg-blue-500";
      case "shortBreak":
        return "bg-green-500";
      case "longBreak":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (minimal) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div
          className={cn(
            "font-mono font-bold tabular-nums",
            sizeClasses[size],
            getSessionColor(),
          )}
        >
          {formattedTime}
        </div>
        {currentSession && (
          <button
            type="button"
            onClick={isRunning ? pauseTimer : () => startTimer()}
            className="p-2 rounded-lg hover:bg-hover/20 transition-colors"
            aria-label={isRunning ? "Pause" : "Play"}
          >
            {isRunning ? (
              <svg
                className="w-6 h-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <title>Pause</title>
                <path d="M9 6v12M15 6v12" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <title>Play</title>
                <path d="M8 6l10 6-10 6V6z" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Session Type Label */}
      <div className="text-center mb-6">
        <h2
          className={cn(
            "text-2xl font-semibold mb-2",
            getSessionColor(),
            "transition-colors duration-300",
          )}
        >
          {getSessionLabel()}
        </h2>
        {currentSession && (
          <p className="text-sm text-muted-foreground">
            {currentSession.duration} minutes
          </p>
        )}
      </div>

      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div
          className={cn(
            "font-mono font-bold tabular-nums transition-[color,opacity,transform] duration-300",
            sizeClasses[size],
            getSessionColor(),
            "select-none",
          )}
        >
          {formattedTime}
        </div>

        {/* Progress Ring/Bar */}
        <div className="w-full max-w-md mt-6">
          <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute top-0 left-0 h-full rounded-full transition-[background-color,opacity] duration-1000 ease-linear",
                getProgressColor(),
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{Math.round(progress)}%</span>
            <span>
              {currentSession
                ? `${currentSession.duration} min session`
                : "Ready to start"}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-center gap-4">
          {!currentSession ? (
            <button
              type="button"
              onClick={() => startTimer()}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium text-lg border border-primary/60 transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 hover:opacity-95 active:scale-95"
            >
              Start Focus
            </button>
          ) : (
            <>
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={isRunning ? pauseTimer : () => startTimer()}
                className={cn(
                  "p-4 rounded-full border transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 active:scale-95",
                  isRunning
                    ? "bg-card text-foreground border-border/40 hover:bg-hover/20"
                    : "bg-primary text-primary-foreground border-primary/60 hover:opacity-95",
                )}
                aria-label={isRunning ? "Pause Timer" : "Start Timer"}
              >
                {isRunning ? (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <title>Pause</title>
                    <path d="M9 6v12M15 6v12" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <title>Play</title>
                    <path d="M8 6l10 6-10 6V6z" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Reset Button */}
              <button
                type="button"
                onClick={resetTimer}
                className="p-4 rounded-full bg-card border border-border/40 hover:bg-hover/20 text-foreground transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 active:scale-95"
                aria-label="Reset Timer"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Reset</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* Session Info */}
      {currentSession && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isRunning ? "Timer running" : "Timer paused"}
          </p>
        </div>
      )}
    </div>
  );
}
