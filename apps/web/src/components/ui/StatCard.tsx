import type { StatCardProps } from "@/types";
import { cn } from "@/utils";

/**
 * Premium statistics display card with voice-first design
 * Enhanced with glass morphism and fluid animations
 */
export function StatCard({ title, value, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative glass bg-card/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:scale-105 hover:border-primary/40 animate-scale-in overflow-hidden",
        className,
      )}
    >
      {/* Premium animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-4xl font-bold bg-gradient-brand bg-clip-text text-transparent tabular-nums tracking-tight">
            {value}
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
              <span className="text-2xl" aria-hidden="true">
                {icon}
              </span>
            </div>
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-brand opacity-20 blur-lg scale-110 group-hover:opacity-30 transition-opacity duration-300"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
