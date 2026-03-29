import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { RealtimeProvider, useRealtime } from "@/contexts/RealtimeContext";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

vi.mock("@/lib/toasts", () => ({
  useToasts: () => ({ push: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

function withQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function Probe({ events }: { events: unknown[] }) {
  const { simulateIncoming, processing, currentAgentState, messages } =
    useRealtime();
  useEffect(() => {
    events.forEach((e) => {
      simulateIncoming?.(e);
    });
  }, [events, simulateIncoming]);
  return (
    <div>
      <div data-testid="processing">{processing ? "yes" : "no"}</div>
      <div data-testid="state">{currentAgentState || ""}</div>
      <div data-testid="assistant-count">
        {messages.filter((m) => m.role === "assistant").length}
      </div>
      <div data-testid="thoughts-count">
        {messages[messages.length - 1]?.thoughts?.length ?? 0}
      </div>
    </div>
  );
}

describe("RealtimeContext AgentEvent handling", () => {
  it("accumulates thoughts and appends to final assistant message", async () => {
    const events = [
      { type: "thought", content: "Starting chain…" },
      { type: "tool_use", tool: "search", input: "query" },
      { type: "response", content: "Here is the answer." },
      { type: "end", content: "done" },
    ];
    const { findByTestId } = render(
      <RealtimeProvider>
        <Probe events={events} />
      </RealtimeProvider>,
      { wrapper: withQueryClient() },
    );

    expect((await findByTestId("processing")).textContent).toBe("no");
    expect((await findByTestId("assistant-count")).textContent).toBe("1");
    const thoughtsCount = Number(
      (await findByTestId("thoughts-count")).textContent || "0",
    );
    expect(thoughtsCount).toBeGreaterThanOrEqual(2);
  });
});
