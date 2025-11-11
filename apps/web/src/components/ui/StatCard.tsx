import type { StatCardProps } from "@/types";
import { cn } from "@/utils";

/**
 * Premium statistics display card with voice-first design
 * Enhanced with glass morphism and fluid animations
 */
export function StatCard({ title, value, icon, className, size = "md" }: StatCardProps) {
	return (
		<div
			className={cn(
				"relative group glass-strong rounded-2xl transition-all duration-300 hover-elevate animate-fade-in",
				size === "xs" ? "p-3" : size === "sm" ? "p-4" : "p-6",
				className,
			)}
		>
			<div className="relative z-10 flex items-center justify-between">
				<div className="flex-1">
					<p
						className={cn(
							"font-semibold text-muted-foreground uppercase tracking-wider",
							size === "xs" ? "text-xs mb-1.5" : size === "sm" ? "text-xs mb-2" : "text-sm mb-2.5",
						)}
					>
						{title}
					</p>
					<p
						className={cn(
							"font-extrabold text-foreground tabular-nums tracking-tight",
							size === "xs" ? "text-2xl" : size === "sm" ? "text-3xl" : "text-4xl",
						)}
					>
						{value}
					</p>
				</div>
				<div className="shrink-0 ml-4 flex items-center justify-center">
					<div
						className={cn(
							"rounded-lg surface-elevated flex items-center justify-center shadow",
							size === "xs" ? "w-8 h-8" : size === "sm" ? "w-10 h-10" : "w-12 h-12",
						)}
					>
						<span className={cn(size === "xs" ? "text-base" : size === "sm" ? "text-lg" : "text-xl")} aria-hidden="true">
							{icon}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
