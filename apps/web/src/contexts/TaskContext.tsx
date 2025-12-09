"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { useToasts } from "@/contexts/ToastContext";
import {
  buildEvent,
  emitDomainEvent,
  onDomainEvent,
} from "@/events/dispatcher";
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  toggleTask as apiToggleTask,
  updateTask as apiUpdateTask,
  listTasks,
} from "@/services/endpoints/tasks";
import type {
  CreateTaskRequest,
  Task,
  TaskStore,
  UpdateTaskRequest,
} from "@/types";
import { generateId, isToday } from "@/utils";

// Action types
type TaskAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: { id: string; updates: Partial<Task> } }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "TOGGLE_TASK"; payload: string };

// Initial state
const initialState: TaskStore = {
  tasks: [],
  loading: false,
  todayTasks: [],
  completedToday: 0,
  tasksByStatus: {
    todo: [],
    inProgress: [],
    done: [],
  },
};

// Reducer function
function taskReducer(state: TaskStore, action: TaskAction): TaskStore {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_TASKS":
      return { ...state, tasks: action.payload, loading: false };

    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.payload] };

    case "UPDATE_TASK": {
      const updatedTasks = state.tasks.map((task) =>
        task.id === action.payload.id
          ? { ...task, ...action.payload.updates, updatedAt: new Date() }
          : task,
      );
      return { ...state, tasks: updatedTasks };
    }

    case "DELETE_TASK": {
      const filteredTasks = state.tasks.filter(
        (task) => task.id !== action.payload,
      );
      return { ...state, tasks: filteredTasks };
    }

    case "TOGGLE_TASK": {
      const updatedTasks = state.tasks.map((task) =>
        task.id === action.payload
          ? {
              ...task,
              completed: !task.completed,
              status: (!task.completed ? "done" : "todo") as Task["status"],
              updatedAt: new Date(),
            }
          : task,
      );
      return { ...state, tasks: updatedTasks };
    }
    default:
      return state;
  }
}

// Context type
interface TaskContextType extends TaskStore {
  addTask: (taskData: CreateTaskRequest) => void;
  updateTask: (updates: UpdateTaskRequest) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  loadTasks: () => Promise<void>;
}

// Create context
const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Provider component
export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  const { push } = useToasts();

  // Computed values (memoized for performance)
  const todayTasks = useMemo(
    () => state.tasks.filter((task) => task.dueDate && isToday(task.dueDate)),
    [state.tasks],
  );

  const completedToday = useMemo(
    () => todayTasks.filter((task) => task.status === "done").length,
    [todayTasks],
  );

  const tasksByStatus = useMemo(
    () => ({
      todo: state.tasks.filter((t) => t.status === "todo"),
      inProgress: state.tasks.filter((t) => t.status === "inProgress"),
      done: state.tasks.filter((t) => t.status === "done"),
    }),
    [state.tasks],
  );

  // Actions
  const addTask = async (taskData: CreateTaskRequest) => {
    // Optimistic creation using local generation for now; when backend present, switch to apiCreateTask
    try {
      const created = await apiCreateTask(taskData);
      dispatch({ type: "ADD_TASK", payload: created });
      emitDomainEvent(buildEvent("task.created", { id: created.id }));
      push({ title: "Task Added", message: created.title, variant: "success" });
    } catch {
      // fallback optimistic
      const newTask: Task = {
        ...taskData,
        id: generateId(),
        tags: taskData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        pomodoroCount: 0,
        completed: false,
        status: "todo",
      };
      dispatch({ type: "ADD_TASK", payload: newTask });
      emitDomainEvent(
        buildEvent("task.created.optimistic", { id: newTask.id }),
      );
      push({
        title: "Task Added (Offline)",
        message: newTask.title,
        variant: "info",
      });
    }
  };

  const updateTask = async (updates: UpdateTaskRequest) => {
    dispatch({ type: "UPDATE_TASK", payload: { id: updates.id, updates } });
    // Attempt remote update (mock)
    try {
      await apiUpdateTask(updates.id, updates);
      emitDomainEvent(buildEvent("task.updated", { id: updates.id }));
      push({
        title: "Task Updated",
        message: "Changes saved",
        variant: "success",
      });
    } catch {
      /* swallow for now */
      push({
        title: "Update Failed",
        message: "Will retry later",
        variant: "warning",
      });
    }
  };

  const deleteTask = async (id: string) => {
    dispatch({ type: "DELETE_TASK", payload: id });
    try {
      await apiDeleteTask(id);
      emitDomainEvent(buildEvent("task.deleted", { id }));
      push({ title: "Task Deleted", message: id, variant: "info" });
    } catch {
      /* noop */
      push({ title: "Delete Failed", message: id, variant: "error" });
    }
  };

  const toggleTask = async (id: string) => {
    dispatch({ type: "TOGGLE_TASK", payload: id });
    try {
      await apiToggleTask(id);
      emitDomainEvent(buildEvent("task.toggled", { id }));
    } catch {
      /* noop */
    }
  };

  const loadTasks = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const tasks = await listTasks();
      dispatch({ type: "SET_TASKS", payload: tasks });
      // Silent load - no toast notification to avoid spam
    } catch (error) {
      console.error("Failed to load tasks:", error);
      dispatch({ type: "SET_LOADING", payload: false });
      push({
        title: "Sync Failed",
        message: "Could not load tasks",
        variant: "error",
      });
    }
  }, [push]);

  // Listen for remote tool completion events to auto-refresh tasks
  useEffect(() => {
    const unsubscribe = onDomainEvent((evt) => {
      if (evt.type === "remote.tool_completed") {
        const tool = evt.data.tool as string;
        if (
          tool === "create_task" ||
          tool === "update_task" ||
          tool === "delete_task" ||
          tool === "complete_task"
        ) {
          console.debug("[TaskContext] Remote change detected, reloading...");
          loadTasks();
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadTasks]);

  const contextValue: TaskContextType = {
    ...state,
    todayTasks,
    completedToday,
    tasksByStatus,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    loadTasks,
  };

  return (
    <TaskContext.Provider value={contextValue}>{children}</TaskContext.Provider>
  );
}

// Hook to use the context
export function useTaskStore() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTaskStore must be used within a TaskProvider");
  }
  return context;
}
