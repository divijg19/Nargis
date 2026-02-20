import type { StatCardProps } from "@/types";
import { cn } from "@/utils";

/**
 * Premium statistics display card with voice-first design
 * Enhanced with glass morphism and fluid animations
 */
export function StatCard({
  title,
  value,
  icon: _icon,
  className,
  size = "md",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-structural bg-card transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200",
        size === "xs" ? "p-3" : size === "sm" ? "p-4" : "p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p
            className={cn(
              "font-semibold text-muted-foreground uppercase tracking-wider",
              size === "xs"
                ? "text-xs mb-1.5"
                : size === "sm"
                  ? "text-xs mb-2"
                  : "text-sm mb-2.5",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "font-semibold text-foreground tabular-nums tracking-tight",
              size === "xs"
                ? "text-2xl"
                : size === "sm"
                  ? "text-3xl"
                  : "text-4xl",
            )}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
