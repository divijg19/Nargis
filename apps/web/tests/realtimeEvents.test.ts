import { describe, expect, it } from "vitest";
import {
  buildToolThought,
  initialAgentStreamState,
  reduceAgentStreamState,
} from "@/lib/realtimeEvents";

describe("realtime event reducer", () => {
  it("builds deterministic tool thoughts and invalidations", () => {
    expect(buildToolThought("create_task", "plan sprint")).toBe(
      "Using create_task (plan sprint)…",
    );

    const transition = reduceAgentStreamState(initialAgentStreamState, {
      type: "tool_use",
      tool: "task_manager",
      input: "create todo",
    });

    expect(transition.next.pendingThoughts).toEqual([
      "Using task_manager (create todo)…",
    ]);
    expect(transition.invalidateQueryKeys).toEqual([["tasks"]]);
  });

  it("finalizes response state and carries accumulated thoughts", () => {
    const midState = reduceAgentStreamState(initialAgentStreamState, {
      type: "thought",
      content: "Starting chain…",
    }).next;

    const response = reduceAgentStreamState(midState, {
      type: "response",
      content: "Done.",
    });

    expect(response.finalResponse).toBe("Done.");
    expect(response.finalThoughts).toEqual(["Starting chain…"]);
    expect(response.next.processing).toBe(false);
    expect(response.next.terminalSeen).toBe(true);
  });
});
