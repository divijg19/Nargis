import { render, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { HabitProvider, useHabitStore } from "@/contexts/HabitContext";
import type { CreateHabitRequest } from "@/types";

// Mock toast context to avoid side effects
vi.mock("@/contexts/ToastContext", () => {
  return {
    useToasts: () => ({ push: vi.fn() }),
    ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock habit endpoints to be deterministic and fast
vi.mock("@/services/endpoints/habits", () => {
  return {
    listHabits: async () => [],
    createHabit: async (data: CreateHabitRequest) => ({
      id: "h1",
      name: data.name,
      icon: data.icon ?? "",
      target: data.target,
      unit: data.unit,
      frequency: data.frequency,
      color: data.color ?? "#000000",
      createdAt: new Date(),
      streak: 0,
      history: [],
    }),
    updateHabit: async () => {},
    deleteHabit: async () => {},
    updateHabitCount: async () => {},
  };
});

function Probe() {
  const { habits, todayProgress, addHabit, updateHabitCount } = useHabitStore();
  const add = () => {
    void addHabit({
      name: "Read 10 pages",
      icon: "book",
      target: 1,
      unit: "pages",
      frequency: "daily",
      color: "#3366ff",
    });
  };
  const toggle = () => {
    const id = habits[0]?.id;
    if (id) void updateHabitCount(id, 1);
  };
  return React.createElement(
    "div",
    null,
    React.createElement(
      "button",
      { type: "button", "aria-label": "add", onClick: add },
      "Add",
    ),
    React.createElement(
      "button",
      { type: "button", "aria-label": "toggle", onClick: toggle },
      "Toggle",
    ),
    React.createElement(
      "div",
      { "data-testid": "count" },
      String(habits.length),
    ),
    React.createElement(
      "div",
      { "data-testid": "completed" },
      String(todayProgress[0]?.completed ?? false),
    ),
  );
}

describe("Habits integration", () => {
  it("adds and marks habit as completed via count update", async () => {
    const { getByRole, findByTestId } = render(
      React.createElement(HabitProvider, null, React.createElement(Probe)),
    );
    expect((await findByTestId("count")).textContent).toBe("0");
    getByRole("button", { name: /add/i }).click();
    await waitFor(async () => {
      expect((await findByTestId("count")).textContent).toBe("1");
    });
    expect((await findByTestId("completed")).textContent).toBe("false");
    getByRole("button", { name: /toggle/i }).click();
    await waitFor(async () => {
      expect((await findByTestId("completed")).textContent).toBe("true");
    });
  });
});
