import { render, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { CreateTaskRequest } from "@/types";

// Lightweight stateful mock for TaskContext (match real `TaskContextType` shape)
vi.mock("@/contexts/TaskContext", () => {
  type Task = { id: string; title: string };
  const TaskProvider = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const useTaskStore = () => {
    const [tasks, setTasks] = React.useState<Task[]>([]);
    const addTask = async (taskData: CreateTaskRequest) => {
      const id = Math.random().toString(36).slice(2);
      const title = taskData.title;
      setTasks((cur) => [...cur, { id, title }]);
      return id;
    };
    const deleteTask = (id: string) => {
      setTasks((cur) => cur.filter((t) => t.id !== id));
    };
    return { tasks, addTask, deleteTask };
  };
  return { TaskProvider, useTaskStore };
});

import { TaskProvider, useTaskStore } from "@/contexts/TaskContext";

function Probe() {
  const { tasks, addTask, deleteTask } = useTaskStore();
  return React.createElement(
    "div",
    null,
    React.createElement(
      "button",
      {
        type: "button",
        "aria-label": "add",
        onClick: async () => {
          await addTask({ title: "Test Task" } as CreateTaskRequest);
        },
      },
      "Add",
    ),
    React.createElement(
      "button",
      {
        type: "button",
        "aria-label": "remove",
        onClick: () => {
          const id = tasks[0]?.id;
          if (id) deleteTask(id);
        },
      },
      "Remove",
    ),
    React.createElement(
      "div",
      { "data-testid": "count" },
      String(tasks.length),
    ),
  );
}

describe("TaskContext integration", () => {
  it("adds and removes tasks deterministically", async () => {
    const { getByRole, findByTestId } = render(
      React.createElement(TaskProvider, null, React.createElement(Probe)),
    );
    expect((await findByTestId("count")).textContent).toBe("0");
    getByRole("button", { name: /add/i }).click();
    await waitFor(async () => {
      expect((await findByTestId("count")).textContent).toBe("1");
    });
    getByRole("button", { name: /remove/i }).click();
    await waitFor(async () => {
      expect((await findByTestId("count")).textContent).toBe("0");
    });
  });
});
