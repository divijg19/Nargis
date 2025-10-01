import type { DashboardCardProps } from "@/types";
import { cn } from "@/utils";

/**
 * Reusable dashboard card component with enhanced depth and glass effect
 * Converted from Vue DashboardCard.vue
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
                "relative group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:-translate-y-0.5 animate-fade-in",
                className,
            )}
        >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    {headerAction}
                </div>
                <div className="text-gray-700 dark:text-gray-300">{children}</div>
            </div>
        </div>
    );
}
