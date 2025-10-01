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

    const getSessionInfo = () => {
        switch (sessionType) {
            case 'work':
                return {
                    label: 'Focus Session',
                    color: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                    emoji: '🎯'
                };
            case 'shortBreak':
                return {
                    label: 'Short Break',
                    color: 'text-green-600 dark:text-green-400',
                    bgColor: 'bg-green-50 dark:bg-green-900/20',
                    emoji: '☕'
                };
            case 'longBreak':
                return {
                    label: 'Long Break',
                    color: 'text-purple-600 dark:text-purple-400',
                    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
                    emoji: '🌟'
                };
            default:
                return {
                    label: 'Focus Session',
                    color: 'text-blue-600 dark:text-blue-400',
                    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                    emoji: '🎯'
                };
        }
    };

    const sessionInfo = getSessionInfo();

    return (
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
                <div className="text-center animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
                        Pomodoro Timer 🍅
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Focus in structured intervals for maximum productivity
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 gap-4 animate-slide-up">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            {todaySessionsCount}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Sessions Today
                        </div>
                    </div>
                    <div className={`rounded-xl p-4 border text-center ${sessionInfo.bgColor} border-gray-200 dark:border-gray-700`}>
                        <div className={`text-3xl font-bold mb-1 ${sessionInfo.color}`}>
                            {Math.round(progress)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Complete
                        </div>
                    </div>
                </div>

                {/* Main Timer Card */}
                <DashboardCard
                    title=""
                    className="animate-scale-in"
                >
                    <div className="flex flex-col items-center space-y-8 py-8">
                        {/* Session Type Badge */}
                        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${sessionInfo.bgColor} border border-gray-200 dark:border-gray-700`}>
                            <span className="text-xl" aria-hidden="true">{sessionInfo.emoji}</span>
                            <span className={`text-sm font-semibold uppercase tracking-wide ${sessionInfo.color}`}>
                                {sessionInfo.label}
                            </span>
                        </div>

                        {/* Timer Display */}
                        <div className="relative">
                            {/* Circular Progress */}
                            <svg
                                className="w-64 h-64 -rotate-90 drop-shadow-lg"
                                viewBox="0 0 100 100"
                                role="img"
                                aria-labelledby="pomodoroProgressTitle"
                            >
                                <title id="pomodoroProgressTitle">Timer progress: {Math.round(progress)}%</title>
                                {/* Background Circle */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    className="stroke-gray-200 dark:stroke-gray-700"
                                    strokeWidth="8"
                                    fill="none"
                                />
                                {/* Progress Circle */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    strokeWidth="8"
                                    fill="none"
                                    className={`transition-all duration-300 ${sessionType === 'work' ? 'stroke-blue-500' :
                                        sessionType === 'shortBreak' ? 'stroke-green-500' :
                                            'stroke-purple-500'
                                        }`}
                                    strokeDasharray={2 * Math.PI * 42}
                                    strokeDashoffset={(1 - progress / 100) * 2 * Math.PI * 42}
                                    strokeLinecap="round"
                                />
                            </svg>

                            {/* Timer Text */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-5xl font-bold tabular-nums text-gray-900 dark:text-white tracking-tight">
                                        {formattedTime}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                        {isRunning ? 'In Progress' : 'Paused'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center space-x-4">
                            {!isRunning ? (
                                <ActionButton
                                    icon="▶"
                                    label="Start"
                                    variant="primary"
                                    size="lg"
                                    onClick={() => startTimer()}
                                />
                            ) : (
                                <ActionButton
                                    icon="⏸"
                                    label="Pause"
                                    variant="secondary"
                                    size="lg"
                                    onClick={pauseTimer}
                                />
                            )}
                            <ActionButton
                                icon="⟲"
                                label="Reset"
                                variant="danger"
                                size="lg"
                                onClick={resetTimer}
                            />
                        </div>

                        {/* Tips */}
                        <div className="max-w-md text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {sessionType === 'work' ? (
                                    <>
                                        <strong>Focus time!</strong> Eliminate distractions and work on a single task.
                                    </>
                                ) : (
                                    <>
                                        <strong>Break time!</strong> Step away from your screen and recharge.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}
