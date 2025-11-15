"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
	const heroRef = useRef<HTMLDivElement | null>(null);

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

	// Freeze hero at mid-scroll only for large+ viewports (lg and above).
	// Use matchMedia to avoid preventing scroll on small screens.
	useEffect(() => {
		if (!heroRef.current) return;

		const mql = window.matchMedia("(min-width: 1024px)");
		const el = heroRef.current;
		const initialBodyOverflow = document.body.style.overflow;

		const applyLock = () => {
			if (!el) return;
			// Scroll internal container to middle
			el.scrollTop = Math.max(0, (el.scrollHeight - el.clientHeight) / 2);
			// Prevent body scroll on large screens
			document.body.style.overflow = "hidden";
		};

		const removeLock = () => {
			// Restore the original body overflow when leaving large viewport
			document.body.style.overflow = initialBodyOverflow;
		};

		// Apply immediately if we're already large
		if (mql.matches) {
			applyLock();
		} else {
			removeLock();
		}

		// Listen for viewport size changes and apply/remove lock accordingly
		const onChange = (e: MediaQueryListEvent) => {
			if (e.matches) applyLock();
			else removeLock();
		};

		if (typeof mql.addEventListener === "function") {
			mql.addEventListener("change", onChange);
		} else {
			// Safari & older browsers
			mql.addListener(onChange);
		}

		return () => {
			if (typeof mql.removeEventListener === "function") {
				mql.removeEventListener("change", onChange);
			} else {
				mql.removeListener(onChange);
			}
			// Restore whatever overflow was set previously
			document.body.style.overflow = initialBodyOverflow;
		};
	}, []);

	return (
		<main className="relative h-screen overflow-hidden pt-16">
			{/* Hero Section (center content + right aside) */}
			<section className="relative overflow-hidden">
				<div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 h-full flex items-center">
					<div className="w-full">
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-y-6 gap-x-6 lg:gap-x-8 h-full items-center">
							{/* Center column: Hero mic + ChatPanel */}
							<div className="order-2 lg:order-2 lg:col-span-7 h-full flex items-center justify-center">
								<div
									ref={heroRef}
									className="relative p-6 surface-floating rounded-3xl border border-border/30 mb-6 w-full max-w-3xl max-h-[calc(100vh-6.5rem)] overflow-auto flex flex-col"
								>
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
									<div className="mt-4">
										<ChatPanel
											compact
											merged
											permissionDenied={permissionDenied}
										/>
									</div>
								</div>
							</div>

							{/* Right column: Hero + Voice-First Productivity */}
							<div className="lg:order-3 order-3 lg:col-span-4">
								{/* Hero moved to right aside */}
								<div className="mb-6 text-left">
									<h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold tracking-tight">
										<span className="gradient-text">Speak</span>
										<span className="text-foreground"> Your </span>
										<span className="gradient-text">Productivity</span>
									</h1>
									<h2 className="text-lg font-semibold mt-2 text-foreground">
										Meet{" "}
										<strong className="font-semibold gradient-nargis">
											Nargis
										</strong>
									</h2>
									<p className="text-sm text-muted-foreground mt-1">
										Your productivity management agent.
									</p>
								</div>
								<div className="mb-4 text-left">
									<h3 className="text-lg font-semibold gradient-nargis mb-2">
										Voice-First Productivity
									</h3>
									<p className="text-sm text-muted-foreground">
										Every feature designed for seamless voice interaction and
										natural conversation.
									</p>
								</div>
								{/* feature cards removed from right aside; reserved for left sidebar */}
								<div className="mt-2" />

								{/* Usage guidelines */}
								<div className="mt-4 text-sm text-muted-foreground space-y-3">
									<h4 className="font-semibold text-foreground">
										How to use Nargis
									</h4>
									<ol className="list-decimal list-inside space-y-1">
										<li>
											Click the microphone or press "Try Voice Assistant" to
											start speaking.
										</li>
										<li>
											Use short, conversational commands: e.g. "Create a task",
											"Start Pomodoro", or "Track habit".
										</li>
										<li>
											Try the example prompts above as starters and customize
											them to your workflow.
										</li>
										<li>
											Explore the dashboard for insights and manage sessions
											from the sidebar.
										</li>
									</ol>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
