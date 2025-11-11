import { useState } from "react";
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
	onEditTask,
	onDeleteTask,
	showActions = false,
}: TaskPreviewProps) {
	const displayTasks = tasks.slice(0, limit);
	const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

	if (displayTasks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center px-4">
				<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
					<span className="text-2xl" aria-hidden="true">
						📝
					</span>
				</div>
				<p className="text-muted-foreground text-sm">No tasks found</p>
				<p className="text-muted-foreground text-xs mt-1">
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
								"shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
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
									"text-sm font-medium text-foreground dark:text-white transition-all duration-200 truncate",
									task.completed && "line-through text-muted-foreground",
								)}
							>
								{task.title}
							</p>
							{task.description && (
								<p className="text-xs text-muted-foreground mt-0.5 truncate">
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
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
								getStatusColor(task.status),
							)}
						>
							{getStatusLabel(task.status)}
						</span>
						{showActions && (onEditTask || onDeleteTask) && (
							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								{onEditTask && (
									<button
										type="button"
										onClick={() => onEditTask(task)}
										className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
										aria-label={`Edit ${task.title}`}
									>
										<svg
											className="w-4 h-4 text-blue-600 dark:text-blue-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											aria-hidden="true"
										>
											<title>Edit</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
								)}
								{onDeleteTask && (
									<button
										type="button"
										onClick={() => {
											if (deletingTaskId === task.id) {
												onDeleteTask(task.id);
												setDeletingTaskId(null);
											} else {
												setDeletingTaskId(task.id);
												setTimeout(() => setDeletingTaskId(null), 3000);
											}
										}}
										className={cn(
											"p-1.5 rounded-md transition-colors",
											deletingTaskId === task.id
												? "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50"
												: "hover:bg-red-100 dark:hover:bg-red-900/30",
										)}
										aria-label={
											deletingTaskId === task.id
												? `Confirm delete ${task.title}`
												: `Delete ${task.title}`
										}
									>
										<svg
											className={cn(
												"w-4 h-4 transition-colors",
												deletingTaskId === task.id
													? "text-red-700 dark:text-red-300"
													: "text-red-600 dark:text-red-400",
											)}
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											aria-hidden="true"
										>
											<title>
												{deletingTaskId === task.id ? "Confirm delete" : "Delete"}
											</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d={
													deletingTaskId === task.id
														? "M5 13l4 4L19 7"
														: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												}
											/>
										</svg>
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			))}

			{tasks.length > limit && (
				<div className="text-center py-3 border-t border-gray-200 dark:border-gray-700">
					<p className="text-sm text-muted-foreground font-medium">
						+{tasks.length - limit} more{" "}
						{tasks.length - limit === 1 ? "task" : "tasks"}
					</p>
				</div>
			)}
		</div>
	);
}
