"use client";

import { useMemo } from "react";
import type { PomodoroSession } from "@/types";
import { cn } from "@/utils";

interface PomodoroStatsProps {
    sessions: PomodoroSession[];
    className?: string;
}

export function PomodoroStats({ sessions, className }: PomodoroStatsProps) {
    const stats = useMemo(() => {
        const completedSessions = sessions.filter((s) => s.completed);
        const workSessions = completedSessions.filter((s) => s.type === "work");

        // Today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaySessions = completedSessions.filter((s) => {
            const sessionDate = new Date(s.startTime);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === today.getTime();
        });

        const todayWorkSessions = todaySessions.filter((s) => s.type === "work");
        const todayMinutes = todayWorkSessions.reduce(
            (sum, s) => sum + s.duration,
            0,
        );

        // This week's stats
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

        const thisWeekSessions = completedSessions.filter((s) => {
            const sessionDate = new Date(s.startTime);
            return sessionDate >= weekStart;
        });

        const weekWorkSessions = thisWeekSessions.filter((s) => s.type === "work");
        const weekMinutes = weekWorkSessions.reduce((sum, s) => sum + s.duration, 0);

        // All-time stats
        const totalMinutes = workSessions.reduce((sum, s) => sum + s.duration, 0);
        const totalHours = Math.floor(totalMinutes / 60);

        // Average session duration
        const avgDuration =
            workSessions.length > 0
                ? Math.round(
                    workSessions.reduce((sum, s) => sum + s.duration, 0) /
                    workSessions.length,
                )
                : 0;

        // Calculate daily breakdown for last 7 days
        const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - i));
            date.setHours(0, 0, 0, 0);

            const daySessions = workSessions.filter((s) => {
                const sessionDate = new Date(s.startTime);
                sessionDate.setHours(0, 0, 0, 0);
                return sessionDate.getTime() === date.getTime();
            });

            return {
                date,
                count: daySessions.length,
                minutes: daySessions.reduce((sum, s) => sum + s.duration, 0),
                label: date.toLocaleDateString("en-US", { weekday: "short" }),
            };
        });

        const maxDailyMinutes = Math.max(
            ...dailyBreakdown.map((d) => d.minutes),
            1,
        );

        return {
            total: completedSessions.length,
            workSessions: workSessions.length,
            todaySessions: todaySessions.length,
            todayWorkSessions: todayWorkSessions.length,
            todayMinutes,
            todayHours: Math.floor(todayMinutes / 60),
            weekSessions: weekWorkSessions.length,
            weekMinutes,
            weekHours: Math.floor(weekMinutes / 60),
            totalMinutes,
            totalHours,
            avgDuration,
            dailyBreakdown,
            maxDailyMinutes,
        };
    }, [sessions]);

    return (
        <div className={cn("space-y-6", className)}>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2">
                        Today
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {stats.todayWorkSessions}
                        </div>
                        <div className="text-sm text-blue-600/70 dark:text-blue-400/70">
                            sessions
                        </div>
                    </div>
                    <div className="text-xs text-blue-600/60 dark:text-blue-400/60 mt-1">
                        {stats.todayMinutes} minutes
                    </div>
                </div>

                <div className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                    <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-2">
                        This Week
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {stats.weekSessions}
                        </div>
                        <div className="text-sm text-purple-600/70 dark:text-purple-400/70">
                            sessions
                        </div>
                    </div>
                    <div className="text-xs text-purple-600/60 dark:text-purple-400/60 mt-1">
                        {stats.weekHours}h {stats.weekMinutes % 60}m
                    </div>
                </div>

                <div className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-2">
                        Total Time
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {stats.totalHours}
                        </div>
                        <div className="text-sm text-green-600/70 dark:text-green-400/70">
                            hours
                        </div>
                    </div>
                    <div className="text-xs text-green-600/60 dark:text-green-400/60 mt-1">
                        {stats.workSessions} focus sessions
                    </div>
                </div>

                <div className="bg-linear-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2">
                        Avg Session
                    </div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.avgDuration}
                        </div>
                        <div className="text-sm text-amber-600/70 dark:text-amber-400/70">
                            min
                        </div>
                    </div>
                    <div className="text-xs text-amber-600/60 dark:text-amber-400/60 mt-1">
                        per focus session
                    </div>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                    Last 7 Days
                </h3>
                <div className="flex items-end justify-between gap-2 h-32">
                    {stats.dailyBreakdown.map((day) => {
                        const heightPercent =
                            stats.maxDailyMinutes > 0
                                ? (day.minutes / stats.maxDailyMinutes) * 100
                                : 0;

                        const isToday =
                            day.date.toDateString() === new Date().toDateString();

                        return (
                            <div
                                key={day.date.toISOString()}
                                className="flex-1 flex flex-col items-center"
                            >
                                <div className="w-full flex items-end justify-center h-24 mb-2">
                                    <div
                                        className={cn(
                                            "w-full rounded-t-lg transition-all duration-300 hover:opacity-80 relative group",
                                            isToday
                                                ? "bg-blue-500 dark:bg-blue-400"
                                                : day.minutes > 0
                                                    ? "bg-gray-300 dark:bg-gray-600"
                                                    : "bg-gray-100 dark:bg-gray-800",
                                        )}
                                        style={{
                                            height: `${Math.max(heightPercent, day.minutes > 0 ? 10 : 5)}%`,
                                        }}
                                        title={`${day.label}: ${day.count} sessions, ${day.minutes} min`}
                                    >
                                        {day.count > 0 && (
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                {day.count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className={cn(
                                        "text-xs font-medium",
                                        isToday
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    {day.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="text-center mt-4">
                    <p className="text-xs text-muted-foreground">
                        Focus minutes per day
                    </p>
                </div>
            </div>
        </div>
    );
}
