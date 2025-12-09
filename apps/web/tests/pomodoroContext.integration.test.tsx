import { act, render, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { PomodoroProvider, usePomodoroStore } from "@/contexts/PomodoroContext";
import { buildEvent, emitDomainEvent } from "@/events/dispatcher";

// Mock toast context
vi.mock("@/contexts/ToastContext", () => {
  return {
    useToasts: () => ({ push: vi.fn() }),
    ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock pomodoro endpoints
vi.mock("@/services/endpoints/pomodoro", () => {
  return {
    listSessions: async () => [],
    recordSession: async () => {},
  };
});

function Probe() {
  const { isRunning, currentSession, timeRemaining } = usePomodoroStore();
  return (
    <div>
      <div data-testid="status">{isRunning ? "Running" : "Stopped"}</div>
      <div data-testid="session-id">{currentSession?.id || "None"}</div>
      <div data-testid="time-remaining">{timeRemaining}</div>
    </div>
  );
}

describe("PomodoroContext Integration", () => {
  it("starts a session when remote.tool_completed event is received", async () => {
    const { getByTestId } = render(
      <PomodoroProvider>
        <Probe />
      </PomodoroProvider>,
    );

    expect(getByTestId("status").textContent).toBe("Stopped");
    expect(getByTestId("session-id").textContent).toBe("None");

    // Simulate remote tool completion
    const toolResult = {
      id: "session-123",
      type: "work",
      duration_minutes: 25,
      started_at: new Date().toISOString(),
      completed: false,
      taskId: "task-1",
    };

    act(() => {
      emitDomainEvent(
        buildEvent("remote.tool_completed", {
          tool: "start_focus",
          result: toolResult,
        }),
      );
    });

    await waitFor(() => {
      expect(getByTestId("status").textContent).toBe("Running");
      expect(getByTestId("session-id").textContent).toBe("session-123");
      // 25 minutes * 60 seconds = 1500
      expect(getByTestId("time-remaining").textContent).toBe("1500");
    });
  });
});
