import { authService } from "@/services/auth";
import type { PomodoroSession } from "@/types";
import { fetchJson } from "../apiClient";

type PomodoroSessionApi = {
  id: string;
  type?: string | null;
  duration_minutes?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  completed?: boolean | null;
  task_id?: string | null;
};

function mapApiTypeToUi(
  type: string | null | undefined,
): PomodoroSession["type"] {
  const normalized = String(type || "work").toLowerCase();
  if (normalized === "short_break" || normalized === "shortbreak") {
    return "shortBreak";
  }
  if (normalized === "long_break" || normalized === "longbreak") {
    return "longBreak";
  }
  return "work";
}

function mapUiTypeToApi(type: PomodoroSession["type"]): string {
  if (type === "shortBreak") return "short_break";
  if (type === "longBreak") return "long_break";
  return "work";
}

function mapApiToSession(api: PomodoroSessionApi): PomodoroSession {
  const durationMinutes =
    typeof api.duration_minutes === "number" && api.duration_minutes > 0
      ? api.duration_minutes
      : 25;

  const startTime = api.started_at ? new Date(api.started_at) : new Date();
  const endTime = api.ended_at ? new Date(api.ended_at) : undefined;

  return {
    id: api.id,
    type: mapApiTypeToUi(api.type),
    duration: durationMinutes,
    startTime,
    endTime,
    completed: Boolean(api.completed),
    taskId: api.task_id ?? undefined,
  };
}

export async function listSessions(): Promise<PomodoroSession[]> {
  const headers = authService.getAuthHeaders();
  const apiSessions = await fetchJson<PomodoroSessionApi[]>(
    "/api/v1/pomodoro",
    {
      headers,
    },
  );
  return apiSessions.map(mapApiToSession);
}

export async function recordSession(
  session: Omit<PomodoroSession, "id">,
): Promise<PomodoroSession> {
  const headers = { ...authService.getAuthHeaders() };

  const created = await fetchJson<PomodoroSessionApi>("/api/v1/pomodoro", {
    method: "POST",
    headers,
    body: JSON.stringify({
      task_id: session.taskId ?? null,
      type: mapUiTypeToApi(session.type),
      duration_minutes: Math.max(1, Math.round(session.duration || 25)),
    }),
  });

  const endedAtIso = (session.endTime || new Date()).toISOString();

  const patched = await fetchJson<PomodoroSessionApi>(
    `/api/v1/pomodoro/${created.id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        completed: Boolean(session.completed),
        ended_at: endedAtIso,
      }),
    },
  );

  return mapApiToSession(patched);
}
