import type { CreateTaskRequest, Task, UpdateTaskRequest } from "@/types";
import { generateId } from "@/utils";
import { mockDelay } from "../apiClient";

// Temporary in-memory mock. Replace with real API calls when backend is ready.
let mockTasks: Task[] = [
  {
    id: "1",
    title: "Complete project proposal",
    description: "Write and submit the Q4 project proposal",
    priority: "high",
    status: "inProgress",
    dueDate: new Date(),
    tags: ["work", "urgent"],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    pomodoroCount: 2,
    completed: false,
  },
];

export async function listTasks(): Promise<Task[]> {
  return mockDelay(
    mockTasks.map((t) => ({ ...t })),
    150,
  );
}

export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const task: Task = {
    ...data,
    id: generateId(),
    tags: data.tags || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    pomodoroCount: 0,
    completed: false,
    status: "todo",
  };
  mockTasks = [...mockTasks, task];
  return mockDelay({ ...task }, 120);
}

export async function updateTask(
  id: string,
  updates: UpdateTaskRequest,
): Promise<Task | null> {
  let updated: Task | null = null;
  mockTasks = mockTasks.map((t) => {
    if (t.id === id) {
      updated = { ...t, ...updates, updatedAt: new Date() };
      return updated;
    }
    return t;
  });
  return mockDelay(updated, 120);
}

export async function deleteTask(id: string): Promise<boolean> {
  const before = mockTasks.length;
  mockTasks = mockTasks.filter((t) => t.id !== id);
  return mockDelay(mockTasks.length !== before, 80);
}

export async function toggleTask(id: string): Promise<Task | null> {
  let result: Task | null = null;
  mockTasks = mockTasks.map((t) => {
    if (t.id === id) {
      const completed = !t.completed;
      result = {
        ...t,
        completed,
        status: completed ? "done" : "todo",
        updatedAt: new Date(),
      };
      return result;
    }
    return t;
  });
  return mockDelay(result, 80);
}
