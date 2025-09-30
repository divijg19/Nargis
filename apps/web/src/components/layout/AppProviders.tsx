"use client";

import type React from "react";
import { HabitProvider } from "@/contexts/HabitContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { TaskProvider } from "@/contexts/TaskContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <ToastProvider>
                <RealtimeProvider>
                    <TaskProvider>
                        <HabitProvider>
                            <PomodoroProvider>{children}</PomodoroProvider>
                        </HabitProvider>
                    </TaskProvider>
                </RealtimeProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
