"use client";

import { useEffect, useState } from "react";
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
					emoji: "🎯",
				};
			case "shortBreak":
				return {
					label: "Short Break",
					color: "text-green-600 dark:text-green-400",
					bgColor: "bg-green-50 dark:bg-green-900/20",
					emoji: "☕",
				};
			case "longBreak":
				return {
					label: "Long Break",
					color: "text-purple-600 dark:text-purple-400",
					bgColor: "bg-purple-50 dark:bg-purple-900/20",
					emoji: "🌟",
				};
			default:
				return {
					label: "Focus Session",
					color: "text-blue-600 dark:text-blue-400",
					bgColor: "bg-blue-50 dark:bg-blue-900/20",
					emoji: "🎯",
				};
		}
	};

	const sessionInfo = getSessionInfo();

	return (
		<div className="min-h-screen bg-app-light transition-all duration-500">
			{/* Premium ambient overlay (place behind content) */}
			<div
				className="absolute inset-0 bg-linear-to-r from-transparent via-emerald-500/5 to-transparent dark:via-emerald-400/10 pointer-events-none -z-10"
				aria-hidden="true"
			/>

			{/* Main content: wider container and accessible main landmark. Add top padding to avoid fixed header overlap. */}
			<main
				id="maincontent"
				className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 app-viewport-available safe-padding"
				tabIndex={-1}
			>
				{/* Premium Header */}
				<div className="text-center animate-fade-in">
					<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 leading-tight tracking-tight">
						<span className="bg-linear-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
							Pomodoro
						</span>
						<span className="text-foreground dark:text-white"> 🍅</span>
					</h1>
					<p className="text-base md:text-lg text-muted-foreground dark:text-slate-300 max-w-2xl mx-auto mt-1">
						Focus in structured intervals for maximum productivity
					</p>
				</div>

				{/* Premium Stats Bar removed — metrics are shown in the left stacked column to avoid redundancy */}

				{/* Main Timer Card */}
				<div className="animate-scale-in mt-8">
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-12 items-start">
						{/* Left stacked metric column */}
						<div className="lg:col-span-1 flex flex-col space-y-6">
							<div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-lg text-center">
								<div className="text-sm text-muted-foreground">
									Sessions Today
								</div>
								<div className="text-2xl md:text-3xl font-semibold text-foreground dark:text-white">
									{todaySessionsCount}
								</div>
							</div>

							<div
								className={`glass backdrop-blur-xl rounded-2xl p-4 border shadow-lg ${sessionInfo.bgColor} border-emerald-200/60 dark:border-emerald-800/60 text-center`}
							>
								<div className="text-sm text-muted-foreground">Complete</div>
								<div
									className={`text-2xl md:text-3xl font-semibold ${sessionInfo.color}`}
								>
									{Math.round(progress)}%
								</div>
							</div>

							<div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-lg text-center">
								<div className="text-sm text-muted-foreground">Focus Today</div>
								<div className="text-2xl md:text-3xl font-semibold text-foreground dark:text-white">
									—
								</div>
							</div>

							<div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-lg text-center">
								<div className="text-sm text-muted-foreground">
									Longest Session
								</div>
								<div className="text-2xl md:text-3xl font-semibold text-foreground dark:text-white">
									—
								</div>
							</div>
						</div>
						{/* Timer column (spans 2 columns on large screens) */}
						<div className="lg:col-span-2 flex items-center justify-center">
							<DashboardCard title="" className="p-8 overflow-visible w-full">
								<PomodoroTimer size="lg" showControls={true} />
							</DashboardCard>
						</div>{" "}
						{/* Right column: controls, stats, guidance and shortcuts - stacked vertically */}
						<aside className="lg:col-span-1 space-y-6 flex flex-col items-stretch aside-sticky">
							<div className="flex flex-col items-center space-y-4">
								{/* Session badge */}
								<div
									className={`inline-flex items-center space-x-3 px-4 py-3 rounded-full ${sessionInfo.bgColor} border border-border/60 dark:border-gray-700`}
								>
									<span className="text-2xl" aria-hidden>
										{sessionInfo.emoji}
									</span>
									<span
										className={`text-sm font-semibold uppercase tracking-wide ${sessionInfo.color}`}
									>
										{sessionInfo.label}
									</span>
								</div>

								{/* Controls */}
								<div className="flex items-center space-x-3">
									{!isRunning ? (
										<ActionButton
											icon="▶"
											label="Start"
											variant="primary"
											size="lg"
											onClick={() => startTimer()}
											aria-label={"Start timer (Space)"}
										/>
									) : (
										<ActionButton
											icon="⏸"
											label="Pause"
											variant="secondary"
											size="lg"
											onClick={pauseTimer}
											aria-label={"Pause timer (Space)"}
										/>
									)}
									<ActionButton
										icon="⟲"
										label="Reset"
										variant="danger"
										size="lg"
										onClick={resetTimer}
										aria-label={"Reset timer (R)"}
									/>
								</div>

								{/* Settings Button */}
								<div className="mt-4">
									<ActionButton
										icon="⚙️"
										label="Settings"
										variant="secondary"
										size="md"
										onClick={() => setIsSettingsOpen(true)}
										className="w-full"
									/>
								</div>
							</div>{" "}
							<div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
								<div className="grid grid-cols-2 gap-3">
									<div className="text-center">
										<div className="text-2xl font-bold text-foreground dark:text-white">
											{todaySessionsCount}
										</div>
										<div className="text-xs text-muted-foreground">
											Sessions Today
										</div>
									</div>
									<div className="text-center">
										<div className={`text-2xl font-bold ${sessionInfo.color}`}>
											{Math.round(progress)}%
										</div>
										<div className="text-xs text-muted-foreground">
											Complete
										</div>
									</div>
								</div>
							</div>
							<div className="glass bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
								<h2 className="text-sm font-semibold text-muted-foreground dark:text-slate-300">
									Session Guidance
								</h2>
								<p className="mt-2 text-sm text-muted-foreground dark:text-gray-400 leading-relaxed">
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
							<div className="glass bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
								<h3 className="text-sm font-semibold text-muted-foreground dark:text-slate-300">
									Keyboard Shortcuts
								</h3>
								<ul className="mt-2 text-sm text-muted-foreground dark:text-gray-400 space-y-1">
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
					<div className="mt-12">
						<PomodoroStats sessions={sessions} />
					</div>

					{/* Session History Section */}
					<div className="mt-8">
						<DashboardCard title="Session History" size="md">
							<SessionHistory sessions={sessions} maxItems={15} />
						</DashboardCard>
					</div>
				</div>
			</main>			{/* Settings Modal */}
			<PomodoroSettings
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
			/>
		</div>
	);
}
