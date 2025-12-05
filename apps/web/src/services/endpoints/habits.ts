import { authService } from "@/services/auth";
import type { CreateHabitRequest, Habit, UpdateHabitRequest } from "@/types";
import { fetchJson } from "../apiClient";

type HabitApi = {
  id: string;
  name: string;
  icon?: string | null;
  target?: number | null;
  unit?: string | null;
  frequency?: Habit["frequency"] | string | null;
  color?: string | null;
  createdAt?: string | null;
  streak?: number | null;
  history?: Array<{
    date: string;
    count?: number | null;
    completed?: boolean | null;
  }> | null;
  category?: string | null;
  currentStreak?: number | null;
  bestStreak?: number | null;
  completedDays?: number | null;
  archived?: boolean | null;
};

function mapApiToHabit(api: HabitApi): Habit {
  return {
    id: api.id,
    name: api.name,
    icon: api.icon ?? "",
    target: typeof api.target === "number" ? api.target : 1,
    unit: api.unit ?? "",
    frequency: (api.frequency as Habit["frequency"]) ?? "daily",
    color: api.color ?? "#000000",
    createdAt: api.createdAt ? new Date(api.createdAt) : new Date(),
    streak: typeof api.streak === "number" ? api.streak : 0,
    history: Array.isArray(api.history)
      ? api.history.map((e) => ({
          date: e.date,
          count: typeof e.count === "number" ? e.count : 0,
          completed: !!e.completed,
        }))
      : [],
    category: api.category ?? undefined,
    currentStreak: api.currentStreak ?? undefined,
    bestStreak: api.bestStreak ?? undefined,
    // Backend provides a numeric count; UI expects HabitEntry[].
    // Until a detailed list is available from the API, omit this.
    completedDays: undefined,
    archived: api.archived ?? undefined,
  };
}

export async function listHabits(): Promise<Habit[]> {
  const headers = authService.getAuthHeaders();
  const apiHabits = await fetchJson<HabitApi[]>("/v1/habits", { headers });
  return apiHabits.map(mapApiToHabit);
}

export async function createHabit(data: CreateHabitRequest): Promise<Habit> {
  const headers = { ...authService.getAuthHeaders() };
  const body = JSON.stringify({
    name: data.name,
    target: data.target,
    unit: data.unit,
    frequency: data.frequency,
    color: data.color,
  });
  const apiHabit = await fetchJson<HabitApi>("/v1/habits", {
    method: "POST",
    headers,
    body,
  });
  return mapApiToHabit(apiHabit);
}

export async function updateHabit(
  id: string,
  updates: UpdateHabitRequest,
): Promise<Habit | null> {
  const headers = { ...authService.getAuthHeaders() };
  const body = JSON.stringify(updates);
  const apiHabit = await fetchJson<HabitApi | null>(`/v1/habits/${id}`, {
    method: "PATCH",
    headers,
    body,
  });
  return apiHabit ? mapApiToHabit(apiHabit) : null;
}

export async function deleteHabit(id: string): Promise<boolean> {
  const headers = authService.getAuthHeaders();
  await fetchJson<void>(`/v1/habits/${id}`, { method: "DELETE", headers });
  return true;
}

export async function updateHabitCount(
  id: string,
  count: number,
): Promise<Habit | null> {
  const headers = { ...authService.getAuthHeaders() };
  try {
    const apiHabit = await fetchJson<HabitApi | null>(
      `/v1/habits/${id}/count`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ count }),
      },
    );
    return apiHabit ? mapApiToHabit(apiHabit) : null;
  } catch {
    return null;
  }
}
