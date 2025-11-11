"use client";

import { useEffect, useState } from "react";
import type { CreateTaskRequest, Task } from "@/types";
import { ActionButton } from "./ActionButton";
import { Modal } from "./Modal";

export interface TaskModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (task: CreateTaskRequest) => void;
	initialData?: Task;
}

export function TaskModal({
	isOpen,
	onClose,
	onSubmit,
	initialData,
}: TaskModalProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
	const [dueDate, setDueDate] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Pre-populate form when editing
	useEffect(() => {
		if (initialData) {
			setTitle(initialData.title || "");
			setDescription(initialData.description || "");
			setPriority(initialData.priority || "medium");
			setDueDate(
				initialData.dueDate
					? new Date(initialData.dueDate).toISOString().split("T")[0]
					: "",
			);
		}
	}, [initialData]);

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!title.trim()) {
			newErrors.title = "Title is required";
		} else if (title.length < 3) {
			newErrors.title = "Title must be at least 3 characters";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = () => {
		if (!validate()) return;

		const taskData: CreateTaskRequest = {
			title: title.trim(),
			description: description.trim(),
			priority,
			dueDate: dueDate ? new Date(dueDate) : undefined,
		};

		onSubmit(taskData);
		handleClose();
	};

	const handleClose = () => {
		// Reset form
		setTitle("");
		setDescription("");
		setPriority("medium");
		setDueDate("");
		setErrors({});
		onClose();
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={initialData ? "Edit Task" : "Create New Task"}
			size="md"
		>
			<div className="space-y-4">
				{/* Title Input */}
				<div>
					<label
						htmlFor="task-title"
						className="block text-sm font-medium text-muted-foreground mb-2"
					>
						Title *
					</label>
					<input
						id="task-title"
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g., Finish project proposal"
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-foreground dark:text-white"
						aria-invalid={!!errors.title}
						aria-describedby={errors.title ? "title-error" : undefined}
					/>
					{errors.title && (
						<p
							id="title-error"
							className="mt-1 text-sm text-red-600 dark:text-red-400"
						>
							{errors.title}
						</p>
					)}
				</div>

				{/* Description Input */}
				<div>
					<label
						htmlFor="task-description"
						className="block text-sm font-medium text-muted-foreground mb-2"
					>
						Description
					</label>
					<textarea
						id="task-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Add more details about this task..."
						rows={3}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-foreground dark:text-white resize-none"
					/>
				</div>

				{/* Priority Select */}
				<div>
					<label
						htmlFor="task-priority"
						className="block text-sm font-medium text-muted-foreground mb-2"
					>
						Priority
					</label>
					<select
						id="task-priority"
						value={priority}
						onChange={(e) =>
							setPriority(e.target.value as "low" | "medium" | "high")
						}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-foreground dark:text-white"
					>
						<option value="low">Low Priority</option>
						<option value="medium">Medium Priority</option>
						<option value="high">High Priority</option>
					</select>
				</div>

				{/* Due Date Input */}
				<div>
					<label
						htmlFor="task-due-date"
						className="block text-sm font-medium text-muted-foreground mb-2"
					>
						Due Date
					</label>
					<input
						id="task-due-date"
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-foreground dark:text-white"
					/>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-3 pt-4">
					<ActionButton
						label="Create Task"
						variant="primary"
						onClick={handleSubmit}
						className="flex-1"
						icon="✓"
					/>
					<ActionButton
						label="Cancel"
						variant="secondary"
						onClick={handleClose}
						icon="✕"
					/>
				</div>
			</div>
		</Modal>
	);
}
