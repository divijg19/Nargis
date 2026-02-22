"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { PomodoroSettings } from "@/components/ui/PomodoroSettings";
import { PomodoroStats } from "@/components/ui/PomodoroStats";
import { PomodoroTimer } from "@/components/ui/PomodoroTimer";
import { SessionHistory } from "@/components/ui/SessionHistory";
import { usePomodoroStore } from "@/contexts/PomodoroContext";

export default function PomodoroPage() {
  const {
    startTimer,
    pauseTimer,
    resetTimer,
    isRunning,
    progress,
    sessionType,
    todaySessionsCount,
    sessions,
    loadSessions,
  } = usePomodoroStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Keyboard shortcuts for quick control: Space = start/pause, R = reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
      )
        return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isRunning) pauseTimer();
        else startTimer();
      }

      if (e.key.toLowerCase() === "r") {
        resetTimer();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRunning, startTimer, pauseTimer, resetTimer]);

  const getSessionInfo = () => {
    switch (sessionType) {
      case "work":
        return {
          label: "Focus Session",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
        };
      case "shortBreak":
        return {
          label: "Short Break",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-900/20",
        };
      case "longBreak":
        return {
          label: "Long Break",
          color: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-50 dark:bg-purple-900/20",
        };
      default:
        return {
          label: "Focus Session",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
        };
    }
  };

  const sessionInfo = getSessionInfo();

  return (
    <RequireAuth>
      <div className="h-full overflow-hidden flex flex-col bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
        {/* Main content: wider container and accessible main landmark. Add top padding to avoid fixed header overlap. */}
        <main
          id="maincontent"
          className="relative z-10 max-w-300 mx-auto px-4 sm:px-6 lg:px-10 app-viewport-available safe-padding flex-1 min-h-0 overflow-auto"
          tabIndex={-1}
        >
          {/* Premium Header */}
          <div className="text-center animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-semibold mb-2 leading-tight tracking-tight text-foreground">
              Pomodoro
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto mt-1">
              Focus in structured intervals for maximum productivity
            </p>
          </div>

          {/* Premium Stats Bar removed — metrics are shown in the left stacked column to avoid redundancy */}

          {/* Main Timer Card */}
          <div className="animate-scale-in mt-6 sm:mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 items-start">
              {/* Left stacked metric column */}
              <div className="lg:col-span-1 flex flex-col space-y-5 sm:space-y-6">
                <div className="rounded-xl p-4 border border-border/25 bg-card text-center">
                  <div className="text-sm text-muted-foreground">
                    Sessions Today
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold text-foreground">
                    {todaySessionsCount}
                  </div>
                </div>

                <div className="rounded-xl p-4 border border-border/25 bg-card text-center">
                  <div className="text-sm text-muted-foreground">Complete</div>
                  <div className="text-2xl md:text-3xl font-semibold text-primary">
                    {Math.round(progress)}%
                  </div>
                </div>

                <div className="rounded-xl p-4 border border-border/25 bg-card text-center">
                  <div className="text-sm text-muted-foreground">
                    Focus Today
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold text-foreground">
                    —
                  </div>
                </div>

                <div className="rounded-xl p-4 border border-border/25 bg-card text-center">
                  <div className="text-sm text-muted-foreground">
                    Longest Session
                  </div>
                  <div className="text-2xl md:text-3xl font-semibold text-foreground">
                    —
                  </div>
                </div>
              </div>
              {/* Timer column (spans 2 columns on large screens) */}
              <div className="lg:col-span-2 flex items-center justify-center">
                <DashboardCard
                  title=""
                  className="p-5 sm:p-6 lg:p-7 overflow-visible w-full"
                >
                  <PomodoroTimer size="lg" showControls={true} />
                </DashboardCard>
              </div>{" "}
              {/* Right column: controls, stats, guidance and shortcuts - stacked vertically */}
              <aside className="lg:col-span-1 space-y-4 sm:space-y-6 flex flex-col items-stretch aside-sticky">
                <div className="flex flex-col items-center space-y-4">
                  {/* Session badge */}
                  <div className="inline-flex items-center space-x-3 px-4 py-3 rounded-full bg-card border border-border/30">
                    <span className="text-sm font-medium text-primary">
                      {sessionInfo.label}
                    </span>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {!isRunning ? (
                      <ActionButton
                        label="Start"
                        variant="primary"
                        size="md"
                        onClick={() => startTimer()}
                        aria-label={"Start timer (Space)"}
                      />
                    ) : (
                      <ActionButton
                        label="Pause"
                        variant="secondary"
                        size="md"
                        onClick={pauseTimer}
                        aria-label={"Pause timer (Space)"}
                      />
                    )}
                    <ActionButton
                      label="Reset"
                      variant="danger"
                      size="md"
                      onClick={resetTimer}
                      aria-label={"Reset timer (R)"}
                    />
                  </div>

                  {/* Settings Button */}
                  <div className="mt-4">
                    <ActionButton
                      label="Settings"
                      variant="secondary"
                      size="md"
                      onClick={() => setIsSettingsOpen(true)}
                      className="w-full"
                    />
                  </div>
                </div>{" "}
                <div className="rounded-xl p-4 border border-border/25 bg-card">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-medium text-foreground">
                        {todaySessionsCount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sessions Today
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-medium text-primary">
                        {Math.round(progress)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Complete
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-6 border border-border/25 bg-card">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Session Guidance
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {sessionType === "work" ? (
                      <>
                        <strong>Focus time!</strong> Eliminate distractions and
                        work on a single task.
                      </>
                    ) : (
                      <>
                        <strong>Break time!</strong> Step away from your screen
                        and recharge.
                      </>
                    )}
                  </p>
                </div>
                <div className="rounded-xl p-4 border border-border/25 bg-card">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Keyboard Shortcuts
                  </h3>
                  <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                    <li>
                      <strong>Space</strong>: Start / Pause
                    </li>
                    <li>
                      <strong>R</strong>: Reset
                    </li>
                  </ul>
                </div>
              </aside>
            </div>

            {/* Analytics & Statistics Section */}
            <div className="mt-10 sm:mt-12">
              <PomodoroStats sessions={sessions} />
            </div>

            {/* Session History Section */}
            <div className="mt-6 sm:mt-8">
              <DashboardCard title="Session History" size="md">
                <SessionHistory sessions={sessions} maxItems={15} />
              </DashboardCard>
            </div>
          </div>
        </main>{" "}
        {/* Settings Modal */}
        <PomodoroSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </RequireAuth>
  );
}
