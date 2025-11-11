"use client";

import { addDays, format, startOfWeek, subDays } from "date-fns";
import React from "react";

type HabitHistoryEntry = {
	date: string;
	completed?: boolean;
	count?: number;
};

type Habit = {
	id: string;
	name: string;
	history: HabitHistoryEntry[];
};

interface HeatmapProps {
	habits: Habit[];
	weeks?: number; // number of weeks to show
}

const COLOR_CLASSES = [
	// empty / no activity
	"bg-slate-50 dark:bg-transparent",
	// low -> high
	"bg-emerald-200 dark:bg-emerald-900/30",
	"bg-emerald-400 dark:bg-emerald-800/40",
	"bg-emerald-600 dark:bg-emerald-700/50",
	"bg-emerald-800 dark:bg-emerald-600/60",
];

export default function Heatmap({ habits, weeks = 12 }: HeatmapProps) {
	// aggregate completions per day across all habits
	const dayCounts = React.useMemo(() => {
		const map = new Map<string, number>();
		for (const habit of habits ?? []) {
			for (const entry of habit.history ?? []) {
				if (!entry?.date) continue;
				const dateKey = entry.date;
				const prev = map.get(dateKey) ?? 0;
				// prefer completed flag, otherwise use count (non-zero)
				const add = entry.completed
					? 1
					: entry.count && entry.count > 0
						? 1
						: 0;
				map.set(dateKey, prev + add);
			}
		}
		return map;
	}, [habits]);

	// Build array of dates per week columns (7 rows) — ensure consistent 7 entries per column
	const weeksArray = React.useMemo(() => {
		const today = new Date();
		const start = startOfWeek(subDays(today, weeks * 7 - 1), {
			weekStartsOn: 0,
		});

		const cols: (Date | null)[][] = Array.from({ length: weeks }, (_, wi) =>
			Array.from({ length: 7 }, (_, di) => addDays(start, wi * 7 + di)),
		);

		return cols;
	}, [weeks]);

	// Find max count to normalize color scale
	const maxCount = React.useMemo(() => {
		let max = 0;
		for (const v of dayCounts.values()) max = Math.max(max, v);
		return Math.max(1, max);
	}, [dayCounts]);

	const getColorClass = (count: number) => {
		if (!count) return COLOR_CLASSES[0];
		const level = Math.min(
			COLOR_CLASSES.length - 1,
			Math.ceil((count / maxCount) * (COLOR_CLASSES.length - 1)),
		);
		return COLOR_CLASSES[level];
	};

	return (
		<div className="w-full">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-semibold text-foreground">
					Activity Heatmap
				</h4>
				<div className="text-xs text-muted-foreground">Last {weeks} weeks</div>
			</div>

			<section
				className="overflow-x-auto"
				aria-label={`Activity heatmap showing last ${weeks} weeks`}
				aria-describedby="heatmap-legend"
			>
				<div className="flex space-x-1 items-start p-2">
					{weeksArray.map((col, ci) => (
						<div
							key={col[0] ? format(col[0] as Date, "yyyy-MM-dd") : `week-${ci}`}
							className="grid grid-rows-7 gap-2"
						>
							{col.map((day, ri) => {
								const key = day ? format(day as Date, "yyyy-MM-dd") : null;
								const count = key ? dayCounts.get(key) || 0 : 0;
								const cls = getColorClass(count);
								const title = key
									? `${format(new Date(key), "EEEE, MMM d, yyyy")}: ${count} completed`
									: "No data";

								return (
									<button
										key={key ?? `empty-${ci}-${ri}`}
										type="button"
										title={title}
										aria-label={title}
										className={`w-5 h-5 rounded-sm ${cls} border border-slate-300 dark:border-slate-700 shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-emerald-300 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900`}
									/>
								);
							})}
						</div>
					))}
				</div>
			</section>

			{/* Legend */}
			<div className="mt-3 flex items-center space-x-3 text-sm text-muted-foreground">
				<span className="sr-only">Legend:</span>
				<span className="text-xs">Less</span>
				<div className="flex items-center space-x-2">
					{COLOR_CLASSES.map((c) => (
						<div
							key={`legend-${c.replace(/[^a-z0-9-]/gi, "")}`}
							className={`${c} w-4 h-4 rounded-sm border border-slate-300 dark:border-slate-700`}
							aria-hidden
						/>
					))}
				</div>
				<span className="text-xs">More</span>
				<div className="ml-4 text-xs text-muted-foreground">
					Max: {maxCount}
				</div>
			</div>
		</div>
	);
}
