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
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "relative group glass bg-card/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/15 hover:border-primary/40 hover:scale-[1.02] animate-fade-in",
        className,
      )}
    >
      {/* Premium gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-primary/5 via-accent/5 to-primary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          {headerAction}
        </div>
        <div className="text-foreground/80">{children}</div>
      </div>
    </div>
  );
}
