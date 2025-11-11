import type { DashboardCardProps } from "@/types";
import { cn } from "@/utils";

/**
 * Premium dashboard card component with voice-first glass morphism
 * Enhanced for consistent voice-native experience
 */
export function DashboardCard({
	title,
	children,
	className,
	headerAction,
	subtitle,
	icon,
	footer,
	size = "md",
}: DashboardCardProps) {
	const isSm = size === "sm";
	const isXs = size === "xs";
	return (
		<div
			className={cn(
				"relative group glass-strong rounded-2xl transition-all duration-300 hover-elevate animate-fade-in",
				isXs ? "p-3" : isSm ? "p-4" : "p-6",
				className,
			)}
		>
			{/* Premium gradient overlay on hover */}
			<div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-ambient" />

			<div className="relative z-10">
				<div className={cn(
					"flex items-start justify-between gap-4",
					isXs ? "mb-2.5" : isSm ? "mb-3" : "mb-4",
				)}>
					<div className="flex items-start gap-4">
						{icon && <div className="shrink-0 mt-1">{icon}</div>}
						<div>
							<h3 className={cn(
								"font-bold text-foreground",
								isXs ? "text-base" : isSm ? "text-lg" : "text-xl",
							)}>{title}</h3>
							{subtitle && (
								<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
							)}
						</div>
					</div>
					{headerAction}
				</div>

				<div className="text-foreground/80">{children}</div>
				{footer && (
					<div className={cn(
						"border-t border-border/60 text-sm text-muted-foreground",
						isXs ? "mt-3 pt-2.5" : isSm ? "mt-4 pt-3" : "mt-6 pt-4",
					)}>
						{footer}
					</div>
				)}
			</div>
		</div>
	);
}
