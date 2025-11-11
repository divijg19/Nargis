"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";

const ChatPanel = dynamic(() => import("@/components/ui/ChatPanel"), {
	ssr: false,
});

import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { useRealtime } from "@/contexts/RealtimeContext";

// Voice-optimized feature showcase
const features = [
	{
		title: "Smart Tasks",
		desc: "Speak to create, organize, and complete tasks effortlessly",
		href: "/tasks",
		icon: "✓",
		voiceCommand: '"Create a new task"',
	},
	{
		title: "Habit Building",
		desc: "Build lasting habits with voice-guided consistency tracking",
		href: "/habits",
		icon: "🔥",
		voiceCommand: '"Track my habits"',
	},
	{
		title: "Deep Focus",
		desc: "Voice-activated Pomodoro sessions for distraction-free work",
		href: "/pomodoro",
		icon: "🍅",
		voiceCommand: '"Start a focus session"',
	},
	{
		title: "Insights Hub",
		desc: "AI-powered productivity insights and performance analytics",
		href: "/dashboard",
		icon: "📊",
		voiceCommand: '"Show my dashboard"',
	},
];

export default function Home() {
	const [permissionDenied, setPermissionDenied] = useState(false);

	// Centralized realtime context for recording and AI results
	const { isListening, startListening, stopListening } = useRealtime();

	// API base left for future health checks if needed

	const handleToggleRecording = useCallback(async () => {
		if (isListening) {
			stopListening();
			return;
		}
		try {
			await startListening();
		} catch {
			// startListening will already push a toast; keep a simple visual fallback
			setPermissionDenied(true);
		}
	}, [isListening, startListening, stopListening]);

	// unified rendering handled by ChatPanel; page does not need local showMore/panel state

	return (
		<main className="relative min-h-screen pt-16">
			{/* Hero Section */}
			<section className="relative overflow-hidden">
				<div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-12">
					<div className="text-center">
						<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-8">
							<span className="gradient-text">Speak</span>
							<span className="text-foreground"> Your </span>
							<span className="gradient-text">Productivity</span>
						</h1>
						<div className="flex flex-col items-center justify-center space-y-3">
							<h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
								Meet{" "}
								<strong className="font-semibold gradient-nargis">
									Nargis
								</strong>
							</h2>
							<p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
								Your productivity management agent.
							</p>
						</div>
					</div>

					<div className="mt-12">
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-y-6 gap-x-6 lg:gap-x-8">
							{/* Left column: Get Started */}
							<div className="lg:order-1 order-2 lg:col-span-3 lg:-mt-28 lg:-mr-6">
								<div className="mb-4">
									<h3 className="text-lg font-semibold gradient-nargis mb-2 text-left">Get Started</h3>
									<p className="text-sm text-muted-foreground mb-3 text-left">Explore Nargis features and boost your productivity</p>
								</div>
								<div className="grid grid-cols-1 gap-3 lg:justify-items-center">
									<Link
										href="/dashboard"
										className="group p-3 w-full max-w-72 surface-elevated rounded-xl border-hairline-token hover-glass transition-all duration-300"
									>
										<div className="flex items-center space-x-3">
											<div className="w-10 h-10 rounded-lg icon-surface flex items-center justify-center transition-colors">
												<span className="text-lg" aria-hidden>📊</span>
											</div>
											<div>
												<div className="font-semibold text-foreground text-sm">Dashboard</div>
												<div className="text-xs text-muted-foreground">View insights</div>
											</div>
										</div>
									</Link>
									<Link
										href="/tasks"
										className="group p-3 w-full max-w-72 surface-elevated rounded-xl border-hairline-token hover-glass transition-all duration-300"
									>
										<div className="flex items-center space-x-3">
											<div className="w-10 h-10 rounded-lg icon-surface flex items-center justify-center transition-colors">
												<span className="text-lg" aria-hidden>✓</span>
											</div>
											<div>
												<div className="font-semibold text-foreground text-sm">Tasks</div>
												<div className="text-xs text-muted-foreground">Manage todos</div>
											</div>
										</div>
									</Link>
									<Link
										href="/habits"
										className="group p-3 w-full max-w-72 surface-elevated rounded-xl border-hairline-token hover-glass transition-all duration-300"
									>
										<div className="flex items-center space-x-3">
											<div className="w-10 h-10 rounded-lg icon-surface flex items-center justify-center transition-colors">
												<span className="text-lg" aria-hidden>🔥</span>
											</div>
											<div>
												<div className="font-semibold text-foreground text-sm">Habits</div>
												<div className="text-xs text-muted-foreground">Build consistency</div>
											</div>
										</div>
									</Link>
									<Link
										href="/pomodoro"
										className="group p-3 w-full max-w-72 surface-elevated rounded-xl border-hairline-token hover-glass transition-all duration-300"
									>
										<div className="flex items-center space-x-3">
											<div className="w-10 h-10 rounded-lg icon-surface flex items-center justify-center transition-colors">
												<span className="text-lg" aria-hidden>🍅</span>
											</div>
											<div>
												<div className="font-semibold text-foreground text-sm">Pomodoro</div>
												<div className="text-xs text-muted-foreground">Deep focus sessions</div>
											</div>
										</div>
									</Link>
									<Link
										href="/journal"
										className="group p-3 w-full max-w-72 surface-elevated rounded-xl border-hairline-token hover-glass transition-all duration-300"
									>
										<div className="flex items-center space-x-3">
											<div className="w-10 h-10 rounded-lg icon-surface flex items-center justify-center transition-colors">
												<span className="text-lg" aria-hidden>📔</span>
											</div>
											<div>
												<div className="font-semibold text-foreground text-sm">Journal</div>
												<div className="text-xs text-muted-foreground">Reflect & track mood</div>
											</div>
										</div>
									</Link>
									<div className="p-3 w-full max-w-72 min-h-32 surface-elevated rounded-xl border-hairline-token">
										<div className="font-semibold text-foreground text-base mb-2">Quick Steps</div>
										<ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
											<li>Press the mic to start listening</li>
											<li>Say “Create a new task” or “Start a focus session”</li>
											<li>Review progress in your Dashboard</li>
										</ol>
									</div>
								</div>
							</div>

							{/* Center column: Hero mic + ChatPanel */}
							<div className="lg:order-2 order-1 lg:col-span-6">
								<div className="relative p-10 surface-floating rounded-3xl border border-border/30 mb-8 max-w-2xl mx-auto">
									<div className="text-center mb-6">
										<div className="flex items-center justify-center">
											<VoiceInputButton
												size="lg"
												iconSizeClass="w-20 h-20"
												iconTranslateY={18}
												showStatus={true}
												statusInline={false}
											/>
										</div>
									</div>
									<div className="mt-6">
										<ChatPanel compact merged permissionDenied={permissionDenied} />
									</div>
								</div>
							</div>

							{/* Right column: Voice-First Productivity */}
							<div className="lg:order-3 order-3 lg:col-span-3 lg:-mt-28">
								<div className="mb-4 text-left">
									<h3 className="text-lg font-semibold gradient-nargis mb-2">Voice-First Productivity</h3>
									<p className="text-sm text-muted-foreground">Every feature designed for seamless voice interaction and natural conversation.</p>
								</div>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-2 justify-items-end">
									{features.map((feature, index) => (
										<Link
											key={feature.title}
											href={feature.href}
											className="group w-full max-w-48 p-4 surface-elevated rounded-xl border-hairline-token hover-glass transition-all duration-300 flex flex-col justify-between aspect-square overflow-hidden"
											style={{ animationDelay: `${index * 80 + 120}ms` }}
										>
											<div className="w-8 h-8 rounded-lg bg-primary/10 mb-2 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
												<span className="text-xl" aria-hidden>{feature.icon}</span>
											</div>
											<h3 className="font-semibold text-foreground text-sm truncate mb-1 group-hover:text-primary transition-colors">{feature.title}</h3>
											<p className="text-muted-foreground text-xs mb-2 leading-relaxed lg:hidden">{feature.desc}</p>
											<div className="p-2 surface-elevated rounded-lg border-hairline-token mt-auto">
												<div className="text-xs text-muted-foreground mb-1 font-medium">Voice:</div>
												<div className="text-xs font-semibold text-foreground">{feature.voiceCommand}</div>
											</div>
										</Link>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="relative py-16">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div className="relative p-8 sm:p-12 overflow-hidden rounded-3xl surface-floating border border-border/30">
						<div className="relative z-10">
							<h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
								Ready to transform your productivity?
							</h2>
							<p className="text-lg mb-8 max-w-2xl mx-auto">
								Join the voice-first productivity revolution. Start speaking
								your way to better workflows today.
							</p>
							<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
								<button
									onClick={handleToggleRecording}
									type="button"
									className="btn btn-primary"
								>
									<span className="mr-3 text-lg" aria-hidden>
										🎤
									</span>
									Try Voice Assistant
								</button>
								<Link href="/dashboard" className="btn btn-secondary">
									<span className="mr-3 text-lg" aria-hidden>
										🚀
									</span>
									Explore Features
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
