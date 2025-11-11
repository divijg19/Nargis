import type { CreateGoalRequest, Goal, UpdateGoalRequest } from "@/types";
import { fetchJson } from "../apiClient";

const GOALS_ENDPOINT = "/v1/goals";

export async function listGoals(): Promise<Goal[]> {
    return fetchJson<Goal[]>(GOALS_ENDPOINT);
}

export async function createGoal(data: CreateGoalRequest): Promise<Goal> {
    return fetchJson<Goal>(GOALS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function getGoal(id: string): Promise<Goal> {
    return fetchJson<Goal>(`${GOALS_ENDPOINT}/${id}`);
}

export async function updateGoal(
    id: string,
    data: Partial<UpdateGoalRequest>,
): Promise<Goal> {
    return fetchJson<Goal>(`${GOALS_ENDPOINT}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteGoal(id: string): Promise<void> {
    return fetchJson<void>(`${GOALS_ENDPOINT}/${id}`, {
        method: "DELETE",
    });
}
