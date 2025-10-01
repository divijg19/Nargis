import { cn } from '@/utils';
import type { DashboardCardProps } from '@/types';

/**
 * Reusable dashboard card component
 * Converted from Vue DashboardCard.vue
 */
export function DashboardCard({
    title,
    children,
    className,
    headerAction
}: DashboardCardProps) {
    return (
        <div
            className={cn(
                'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6',
                className
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                </h3>
                {headerAction}
            </div>
            {children}
        </div>
    );
}