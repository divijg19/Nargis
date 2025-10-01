import type { TaskPreviewProps } from "@/types";
import { cn, getStatusColor, getStatusLabel } from "@/utils";

/**
 * Task preview component for displaying task lists
 * Converted from Vue TaskPreview.vue
 */
export function TaskPreview({
    tasks,
    limit = 5,
    onToggleTask,
}: TaskPreviewProps) {
    const displayTasks = tasks.slice(0, limit);

    if (displayTasks.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No tasks found</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {displayTasks.map((task) => (
                <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => onToggleTask(task.id)}
                            aria-label={task.title}
                            className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 appearance-none",
                                task.completed
                                    ? "bg-green-600 border-green-600 text-white"
                                    : "border-gray-300 dark:border-gray-600 hover:border-green-500",
                            )}
                        />
                        <div>
                            <p
                                className={cn(
                                    "text-sm font-medium text-gray-900 dark:text-white",
                                    task.completed && "line-through text-gray-500",
                                )}
                            >
                                {task.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {task.priority} priority
                            </p>
                        </div>
                    </div>
                    <span
                        className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            getStatusColor(task.status),
                        )}
                    >
                        {getStatusLabel(task.status)}
                    </span>
                </div>
            ))}

            {tasks.length > limit && (
                <div className="text-center py-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        +{tasks.length - limit} more tasks
                    </p>
                </div>
            )}
        </div>
    );
}
