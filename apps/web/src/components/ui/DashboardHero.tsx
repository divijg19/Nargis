"use client";

// import ChatPanel from "./ChatPanel"; // Removed ChatPanel usage
import { VoiceInputButton } from "./VoiceInputButton";

export default function DashboardHero({ greeting }: { greeting?: string }) {
	const getGreeting = () =>
		greeting ??
		(() => {
			const hour = new Date().getHours();
			if (hour < 12) return "Good morning";
			if (hour < 18) return "Good afternoon";
			return "Good evening";
		})();

	return (
		<section className="relative mb-8 w-full">
			<div className="w-full bg-card/60 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-border flex items-center justify-between gap-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex-1">
					<div className="flex items-center gap-3 mb-3">
						<h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
							<span className="bg-linear-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
								{getGreeting()}!
							</span>
						</h2>
					</div>
					<p className="text-slate-600 dark:text-slate-300 max-w-xl">
						Welcome back — here's a tailored overview of your day. Use voice
						commands anytime with the microphone.
					</p>
				</div>

				<div className="shrink-0">
					<VoiceInputButton size="lg" showStatus={true} />
				</div>
			</div>
		</section>
	);
}
