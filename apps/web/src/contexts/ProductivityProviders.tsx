"use client";

import type React from "react";
import { HabitProvider } from "@/contexts/HabitContext";
import { JournalProvider } from "@/contexts/JournalContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { TaskProvider } from "@/contexts/TaskContext";

export function ProductivityProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskProvider>
      <HabitProvider>
        <JournalProvider>
          <PomodoroProvider>{children}</PomodoroProvider>
        </JournalProvider>
      </HabitProvider>
    </TaskProvider>
  );
}
