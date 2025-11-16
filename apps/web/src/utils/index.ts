import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind classes with clsx
 * Handles conditional classes and resolves conflicts
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Get color classes for task priority
 */
export function getPriorityColor(priority: "low" | "medium" | "high") {
	switch (priority) {
		case "low":
			return "priority-low";
		case "medium":
			return "priority-medium";
		case "high":
			return "priority-high";
		default:
			return "priority-default";
	}
}

/**
 * Get color classes for task status
 */
export function getStatusColor(status: "todo" | "inProgress" | "done") {
	switch (status) {
		case "todo":
			return "status-todo";
		case "inProgress":
			return "status-inProgress";
		case "done":
			return "status-done";
		default:
			return "status-todo";
	}
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: "todo" | "inProgress" | "done") {
	switch (status) {
		case "todo":
			return "To Do";
		case "inProgress":
			return "In Progress";
		case "done":
			return "Done";
		default:
			return "Unknown";
	}
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string) {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string) {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number, target: number): number {
	if (target === 0) return 0;
	return Math.min(Math.round((current / target) * 100), 100);
}

/**
 * Generate random ID (for client-side usage)
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const today = new Date();
	return d.toDateString() === today.toDateString();
}

/**
 * Get week start date
 */
export function getWeekStart(date = new Date()): Date {
	const weekStart = new Date(date);
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());
	weekStart.setHours(0, 0, 0, 0);
	return weekStart;
}

/**
 * Check if date is in current week
 */
export function isThisWeek(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const weekStart = getWeekStart();
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);
	return d >= weekStart && d < weekEnd;
}

/**
 * Return a stable YYYY-MM-DD key in the user's local timezone suitable for grouping
 */
export function dateKey(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const local = new Date(d);
	const y = local.getFullYear();
	const m = String(local.getMonth() + 1).padStart(2, "0");
	const day = String(local.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}m`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}
