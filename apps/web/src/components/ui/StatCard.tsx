import type { StatCardProps } from "@/types";
import { cn } from "@/utils";

/**
 * Statistics display card component with enhanced visuals and depth
 * Converted from Vue StatCard.vue
 */
export function StatCard({ title, value, icon, className }: StatCardProps) {
    return (
        <div
            className={cn(
                "group relative bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-850/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:scale-[1.02] hover:-translate-y-1 animate-scale-in overflow-hidden",
                className,
            )}
        >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        {title}
                    </p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                        {value}
                    </p>
                </div>
                <div className="flex-shrink-0 ml-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl" aria-hidden="true">
                            {icon}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
