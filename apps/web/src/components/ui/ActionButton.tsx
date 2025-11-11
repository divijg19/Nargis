import type { ActionButtonProps } from "@/types";
import { cn } from "@/utils";

/**
 * Premium action button component with voice-first design
 * Enhanced with glass morphism and fluid animations
 */
export function ActionButton({
	icon,
	label,
	variant = "secondary",
	size = "md",
	onClick,
	disabled = false,
	className,
	loading = false,
	iconPosition = "left",
}: ActionButtonProps) {
	const baseClasses =
		"inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover-elevate active:scale-95";

	const variantClasses = {
		primary:
			"bg-gradient-brand text-primary-foreground hover:opacity-90 focus:ring-primary shadow-lg shadow-primary/30 hover:shadow-primary/40",
		secondary:
			"glass bg-secondary/90 backdrop-blur-xl text-secondary-foreground hover:bg-secondary/70 focus:ring-ring border border-border",
		danger:
			"bg-linear-to-r from-destructive to-red-600 text-destructive-foreground hover:opacity-90 focus:ring-destructive shadow-lg shadow-destructive/30 hover:shadow-destructive/40",
	};

	const sizeClasses = {
		sm: "px-4 py-2.5 text-sm",
		md: "px-6 py-3 text-base",
		lg: "px-8 py-4 text-lg",
	};

	const content = (
		<>
			{icon && iconPosition === "left" && (
				<span className="text-lg mr-2" aria-hidden>
					{icon}
				</span>
			)}
			<span>{label}</span>
			{icon && iconPosition === "right" && (
				<span className="text-lg ml-2" aria-hidden>
					{icon}
				</span>
			)}
			{loading && (
				<span
					className="ml-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-middle"
					aria-hidden
				/>
			)}
		</>
	);
	return (
		<button
			type="button"
			onClick={!loading ? onClick : undefined}
			aria-disabled={disabled || loading}
			disabled={disabled || loading}
			className={cn(
				baseClasses,
				variantClasses[variant],
				sizeClasses[size],
				loading && "opacity-80 cursor-progress",
				className,
			)}
		>
			{content}
		</button>
	);
}
