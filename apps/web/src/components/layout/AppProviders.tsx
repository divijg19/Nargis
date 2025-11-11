"use client";

import type React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoalProvider } from "@/contexts/GoalContext";
import { HabitProvider } from "@/contexts/HabitContext";
import { JournalProvider } from "@/contexts/JournalContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { TaskProvider } from "@/contexts/TaskContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider>
			<ToastProvider>
				<AuthProvider>
					<RealtimeProvider>
						<TaskProvider>
							<HabitProvider>
								<JournalProvider>
									<GoalProvider>
										<PomodoroProvider>{children}</PomodoroProvider>
									</GoalProvider>
								</JournalProvider>
							</HabitProvider>
						</TaskProvider>
					</RealtimeProvider>
				</AuthProvider>
			</ToastProvider>
		</ThemeProvider>
	);
}