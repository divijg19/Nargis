import { cn } from '@/utils';
import type { StatCardProps } from '@/types';

/**
 * Statistics display card component
 * Converted from Vue StatCard.vue
 */
export function StatCard({
    title,
    value,
    icon,
    className
}: StatCardProps) {
    return (
        <div
            className={cn(
                'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6',
                className
            )}
        >
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <span className="text-2xl">{icon}</span>
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}