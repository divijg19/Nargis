import type { PomodoroSession } from "@/types";
import { generateId } from "@/utils";
import { mockDelay } from "../apiClient";

// Generate some sample historical sessions
const now = new Date();
const today = new Date(now);
today.setHours(14, 30, 0, 0);

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(10, 0, 0, 0);

const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
twoDaysAgo.setHours(15, 0, 0, 0);

let mockSessions: PomodoroSession[] = [
	{
		id: generateId(),
		type: "work",
		duration: 25,
		startTime: new Date(today.getTime()),
		endTime: new Date(today.getTime() + 25 * 60 * 1000),
		completed: true,
	},
	{
		id: generateId(),
		type: "shortBreak",
		duration: 5,
		startTime: new Date(today.getTime() + 26 * 60 * 1000),
		endTime: new Date(today.getTime() + 31 * 60 * 1000),
		completed: true,
	},
	{
		id: generateId(),
		type: "work",
		duration: 25,
		startTime: new Date(today.getTime() + 35 * 60 * 1000),
		endTime: new Date(today.getTime() + 60 * 60 * 1000),
		completed: true,
	},
	{
		id: generateId(),
		type: "work",
		duration: 25,
		startTime: yesterday,
		endTime: new Date(yesterday.getTime() + 25 * 60 * 1000),
		completed: true,
	},
	{
		id: generateId(),
		type: "shortBreak",
		duration: 5,
		startTime: new Date(yesterday.getTime() + 26 * 60 * 1000),
		endTime: new Date(yesterday.getTime() + 31 * 60 * 1000),
		completed: true,
	},
	{
		id: generateId(),
		type: "work",
		duration: 25,
		startTime: twoDaysAgo,
		endTime: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000),
		completed: true,
	},
	{
		id: generateId(),
		type: "longBreak",
		duration: 15,
		startTime: new Date(twoDaysAgo.getTime() + 26 * 60 * 1000),
		endTime: new Date(twoDaysAgo.getTime() + 41 * 60 * 1000),
		completed: true,
	},
];

export async function listSessions(): Promise<PomodoroSession[]> {
	return mockDelay(
		mockSessions.map((s) => ({ ...s })),
		120,
	);
}

export async function recordSession(
	session: Omit<PomodoroSession, "id">,
): Promise<PomodoroSession> {
	const stored: PomodoroSession = { ...session, id: generateId() };
	mockSessions = [...mockSessions, stored];
	return mockDelay({ ...stored }, 80);
}
