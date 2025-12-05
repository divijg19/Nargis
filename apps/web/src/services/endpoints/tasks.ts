import { authService } from "@/services/auth";
import type { CreateTaskRequest, Task, UpdateTaskRequest } from "@/types";
import { fetchJson } from "../apiClient";

// API mappers between Python backend and frontend types
type TaskApi = {
  id: string;
  title: string;
  description?: string | null;
  priority?: Task["priority"] | string | null;
  status?: string | null;
  dueDate?: string | null;
  due_date?: string | null;
  tags?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  pomodoroCount?: number | null;
};

function mapApiToTask(api: TaskApi): Task {
  const statusApi: string | undefined = api.status ?? undefined;
  const status: Task["status"] =
    statusApi === "done"
      ? "done"
      : statusApi === "inProgress" || statusApi === "in_progress"
        ? "inProgress"
        : "todo"; // default/fallback
  return {
    id: api.id,
    title: api.title,
    description: api.description ?? undefined,
    priority: (api.priority as Task["priority"]) ?? "medium",
    status,
    dueDate: api.dueDate
      ? new Date(api.dueDate)
      : api.due_date
        ? new Date(api.due_date)
        : undefined,
    tags: Array.isArray(api.tags) ? api.tags : [],
    createdAt: api.createdAt ? new Date(api.createdAt) : new Date(),
    updatedAt: api.updatedAt ? new Date(api.updatedAt) : new Date(),
    pomodoroCount:
      typeof api.pomodoroCount === "number" ? api.pomodoroCount : 0,
    completed: status === "done",
  };
}

function mapTaskCreateToApi(data: CreateTaskRequest) {
  return {
    title: data.title,
    description: data.description ?? undefined,
    status: "pending", // backend default; mapped to "todo" in UI
    priority: data.priority ?? undefined,
    due_date: data.dueDate ? data.dueDate.toISOString() : undefined,
  };
}

function mapTaskUpdateToApi(updates: UpdateTaskRequest) {
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined)
    patch.description = updates.description;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.status !== undefined) {
    patch.status =
      updates.status === "done"
        ? "done"
        : updates.status === "inProgress"
          ? "in_progress"
          : "pending";
  }
  if (
    (updates as Partial<Record<"dueDate", Date | undefined>>).dueDate !==
    undefined
  ) {
    const d = (updates as Partial<Record<"dueDate", Date | undefined>>).dueDate;
    patch.due_date = d ? d.toISOString() : undefined;
  }
  return patch;
}

export async function listTasks(): Promise<Task[]> {
  const headers = authService.getAuthHeaders();
  const apiTasks = await fetchJson<TaskApi[]>("/v1/tasks", { headers });
  return apiTasks.map(mapApiToTask);
}

export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const headers = { ...authService.getAuthHeaders() };
  const body = JSON.stringify(mapTaskCreateToApi(data));
  const apiTask = await fetchJson<TaskApi>("/v1/tasks", {
    method: "POST",
    headers,
    body,
  });
  return mapApiToTask(apiTask);
}

export async function updateTask(
  id: string,
  updates: UpdateTaskRequest,
): Promise<Task | null> {
  const headers = { ...authService.getAuthHeaders() };
  const body = JSON.stringify(mapTaskUpdateToApi(updates));
  const apiTask = await fetchJson<TaskApi | null>(`/v1/tasks/${id}`, {
    method: "PATCH",
    headers,
    body,
  });
  return apiTask ? mapApiToTask(apiTask) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const headers = authService.getAuthHeaders();
  await fetchJson<void>(`/v1/tasks/${id}`, { method: "DELETE", headers });
  return true;
}

// No direct toggle endpoint exists in backend; perform a best-effort status flip via PATCH.
export async function toggleTask(id: string): Promise<Task | null> {
  const headers = { ...authService.getAuthHeaders() };
  try {
    const apiTask = await fetchJson<TaskApi | null>(`/v1/tasks/${id}/toggle`, {
      method: "POST",
      headers,
    });
    return apiTask ? mapApiToTask(apiTask) : null;
  } catch {
    return null;
  }
}
