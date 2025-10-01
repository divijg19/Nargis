"use client";

import { useEffect } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { usePomodoroStore } from "@/contexts/PomodoroContext";

export default function PomodoroPage() {
    const {
        startTimer,
        pauseTimer,
        resetTimer,
        formattedTime,
        isRunning,
        progress,
        sessionType,
        todaySessionsCount,
        loadSessions,
    } = usePomodoroStore();

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <h1 className="text-3xl font-bold mb-2">Pomodoro</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Focus in structured intervals to maximize productivity.
            </p>
            <DashboardCard
                title="Current Session"
                headerAction={
                    <span className="text-xs text-gray-500">
                        Completed Today: {todaySessionsCount}
                    </span>
                }
            >
                <div className="flex flex-col items-center space-y-6 py-4">
                    <div className="relative w-48 h-48">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" role="img" aria-labelledby="pomodoroProgressTitle">
                            <title id="pomodoroProgressTitle">Pomodoro progress</title>
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                className="stroke-gray-200 dark:stroke-gray-700"
                                strokeWidth="10"
                                fill="none"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                strokeWidth="10"
                                fill="none"
                                className="stroke-blue-500 transition-all duration-300"
                                strokeDasharray={2 * Math.PI * 45}
                                strokeDashoffset={(1 - progress / 100) * 2 * Math.PI * 45}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {sessionType}
                            </span>
                            <span className="text-3xl font-semibold tabular-nums">
                                {formattedTime}
                            </span>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        {!isRunning && (
                            <ActionButton
                                icon="▶"
                                label="Start"
                                variant="primary"
                                onClick={() => startTimer()}
                            />
                        )}
                        {isRunning && (
                            <ActionButton
                                icon="⏸"
                                label="Pause"
                                variant="secondary"
                                onClick={pauseTimer}
                            />
                        )}
                        <ActionButton
                            icon="⟲"
                            label="Reset"
                            variant="danger"
                            onClick={resetTimer}
                        />
                    </div>
                </div>
            </DashboardCard>
        </div>
    );
}
