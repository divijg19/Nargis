import type { PomodoroSession } from "@/types";
import { generateId } from "@/utils";
import { mockDelay } from "../apiClient";

let mockSessions: PomodoroSession[] = [];

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
