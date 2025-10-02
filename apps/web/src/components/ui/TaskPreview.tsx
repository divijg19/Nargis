import type { TaskPreviewProps } from "@/types";
import { cn, getStatusColor, getStatusLabel } from "@/utils";

/**
 * Task preview component with enhanced interactions
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
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
          <span className="text-3xl" aria-hidden="true">
            📝
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No tasks found
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Create your first task to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayTasks.map((task, index) => (
        <div
          key={task.id}
          className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onToggleTask(task.id)}
              aria-label={
                task.completed
                  ? `Mark "${task.title}" as incomplete`
                  : `Mark "${task.title}" as complete`
              }
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                task.completed
                  ? "bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20",
              )}
            >
              {task.completed && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium text-gray-900 dark:text-white transition-all duration-200 truncate",
                  task.completed &&
                    "line-through text-gray-500 dark:text-gray-500",
                )}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    task.priority === "high" &&
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    task.priority === "medium" &&
                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                    task.priority === "low" &&
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  )}
                >
                  {task.priority}
                </span>
              </div>
            </div>
          </div>
          <span
            className={cn(
              "flex-shrink-0 ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              getStatusColor(task.status),
            )}
          >
            {getStatusLabel(task.status)}
          </span>
        </div>
      ))}

      {tasks.length > limit && (
        <div className="text-center py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            +{tasks.length - limit} more{" "}
            {tasks.length - limit === 1 ? "task" : "tasks"}
          </p>
        </div>
      )}
    </div>
  );
}
