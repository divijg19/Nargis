import type {
	CreateHabitRequest,
	Habit,
	HabitEntry,
	UpdateHabitRequest,
} from "@/types";
import { generateId } from "@/utils";
import { mockDelay } from "../apiClient";

let mockHabits: Habit[] = [
	{
		id: "h1",
		name: "Exercise",
		icon: "💪",
		target: 1,
		unit: "session",
		frequency: "daily",
		color: "#10B981",
		createdAt: new Date(Date.now() - 7 * 86400000),
		streak: 3,
		history: [],
	},
];

export async function listHabits(): Promise<Habit[]> {
	return mockDelay(
		mockHabits.map((h) => ({ ...h })),
		150,
	);
}

export async function createHabit(data: CreateHabitRequest): Promise<Habit> {
	const habit: Habit = {
		...data,
		id: generateId(),
		createdAt: new Date(),
		streak: 0,
		history: [],
	};
	mockHabits = [...mockHabits, habit];
	return mockDelay({ ...habit }, 120);
}

export async function updateHabit(
	id: string,
	updates: UpdateHabitRequest,
): Promise<Habit | null> {
	let updated: Habit | null = null;
	mockHabits = mockHabits.map((h) => {
		if (h.id === id) {
			updated = { ...h, ...updates };
			return updated;
		}
		return h;
	});
	return mockDelay(updated, 120);
}

export async function deleteHabit(id: string): Promise<boolean> {
	const before = mockHabits.length;
	mockHabits = mockHabits.filter((h) => h.id !== id);
	return mockDelay(mockHabits.length !== before, 80);
}

export async function updateHabitCount(
	id: string,
	count: number,
): Promise<Habit | null> {
	let updated: Habit | null = null;
	const today = new Date().toISOString().split("T")[0];
	mockHabits = mockHabits.map((h) => {
		if (h.id === id) {
			const existing = h.history.findIndex((e) => e.date === today);
			const completed = count >= h.target;
			const entry: HabitEntry = { date: today, count, completed };
			const history = [...h.history];
			if (existing >= 0) history[existing] = entry;
			else history.push(entry);
			updated = { ...h, history };
			return updated;
		}
		return h;
	});
	return mockDelay(updated, 100);
}
