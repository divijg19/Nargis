import { describe, expect, it } from "vitest";
import { accumulateAgentEvents } from "@/lib/agentEvents";
import type { AgentEvent } from "@/types";

describe("AgentEvent accumulator", () => {
  it("collects thoughts and returns final response", () => {
    const events: ReadonlyArray<AgentEvent> = [
      { type: "thought", content: "Starting chain…" },
      { type: "tool_use", tool: "search", input: "query" },
      { type: "response", content: "Here is the answer." },
      { type: "end", content: "done" },
    ] as const;
    const { thoughts, response } = accumulateAgentEvents(
      events as AgentEvent[],
    );
    expect(response).toBe("Here is the answer.");
    expect(thoughts.length).toBeGreaterThanOrEqual(2);
    expect(thoughts[0]).toContain("Starting");
  });
});
