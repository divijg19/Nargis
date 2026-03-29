"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { PomodoroSettings } from "@/components/ui/PomodoroSettings";
import { PomodoroStats } from "@/components/ui/PomodoroStats";
import { PomodoroTimer } from "@/components/ui/PomodoroTimer";
import { SessionHistory } from "@/components/ui/SessionHistory";
import { usePomodoroController } from "@/hooks/usePomodoroController";

export default function PomodoroPage() {
  const {
    isRunning,
    progress,
    sessionType,
    todaySessionsCount,
    sessions,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    updateSettings,
    formattedTime,
    currentSession,
  } = usePomodoroController();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
        <PageCanvas className="gap-8">
          <div className="animate-fade-in text-center">
            <h1 className="mb-2 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              Pomodoro
            </h1>
            <p className="mx-auto mt-1 max-w-2xl text-base text-muted-foreground">
              Focus in structured intervals for maximum productivity.
            </p>
          </div>

          <div className="animate-scale-in grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.9fr)] xl:items-start">
            <DashboardCard
              title=""
              className="w-full overflow-visible p-5 sm:p-6 lg:p-7"
            >
              <PomodoroTimer
                size="lg"
                showControls={true}
                formattedTime={formattedTime}
                progress={progress}
                sessionType={sessionType}
                isRunning={isRunning}
                currentSession={currentSession}
                onStart={() => startTimer()}
                onPause={pauseTimer}
                onReset={resetTimer}
              />
            </DashboardCard>

            <aside className="flex flex-col items-stretch space-y-4 sm:space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="inline-flex items-center space-x-3 rounded-full border border-border/30 bg-card px-4 py-3">
                  <span className="text-sm font-medium text-primary">
                    {sessionInfo.label}
                  </span>
                </div>

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

                <ActionButton
                  label="Settings"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/25 bg-card p-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    Sessions Today
                  </div>
                  <div className="text-2xl font-semibold text-foreground md:text-3xl">
                    {todaySessionsCount}
                  </div>
                </div>
                <div className="rounded-xl border border-border/25 bg-card p-4 text-center">
                  <div className="text-sm text-muted-foreground">Complete</div>
                  <div className="text-2xl font-semibold text-primary md:text-3xl">
                    {Math.round(progress)}%
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/25 bg-card p-6">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Session Guidance
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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

              <div className="rounded-xl border border-border/25 bg-card p-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Keyboard Shortcuts
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
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

          <PomodoroStats sessions={sessions} />

          <DashboardCard title="Session History" size="md">
            <SessionHistory sessions={sessions} maxItems={15} />
          </DashboardCard>
        </PageCanvas>

        {/* Settings Modal */}
        <PomodoroSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={updateSettings}
        />
      </div>
    </RequireAuth>
  );
}
