import type { ActionButtonProps } from "@/types";
import { cn } from "@/utils";

/**
 * Premium action button component with voice-first design
 * Enhanced with glass morphism and fluid animations
 */
export function ActionButton({
  label,
  variant = "secondary",
  size = "md",
  onClick,
  disabled = false,
  className,
  loading = false,
}: ActionButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-lg transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border";

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground border-primary/60 hover:opacity-95 focus:ring-primary",
    secondary:
      "bg-card text-foreground border-border/40 hover:bg-hover/20 focus:ring-ring",
    danger:
      "bg-card text-destructive border-destructive/35 hover:bg-destructive/8 focus:ring-destructive",
  };

  const sizeClasses = {
    sm: "px-4 py-2.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const content = (
    <>
      <span>{label}</span>
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
