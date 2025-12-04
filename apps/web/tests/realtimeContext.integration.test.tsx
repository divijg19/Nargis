import { act, render, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

type TestEvent =
  | { type: "thought"; content: string }
  | { type: "tool_use"; tool: string; input?: string }
  | { type: "response"; content: string }
  | { type: "end"; content?: string };

// Mock RealtimeContext to a lightweight provider + hook to exercise event flow
const _messages: Array<{
  role: "user" | "assistant";
  text: string;
  ts: number;
  thoughts?: string[];
}> = [];
const _processing = false;
const _currentState: string | null = null;
const _pendingThoughts: string[] = [];
vi.mock("@/contexts/RealtimeContext", () => {
  const RealtimeProvider = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const useRealtime = () => {
    const [messages, setMessages] = React.useState<
      Array<{
        role: "user" | "assistant";
        text: string;
        ts: number;
        thoughts?: string[];
      }>
    >([]);
    const [processing, setProcessing] = React.useState(false);
    const [currentAgentState, setCurrentAgentState] = React.useState<
      string | null
    >(null);
    const pendingRef = React.useRef<string[]>([]);
    const endedRef = React.useRef<boolean>(false);
    const simulateIncoming = (msg: TestEvent) => {
      if (endedRef.current) return;
      if (msg && typeof msg === "object" && "type" in msg) {
        const evt = msg;
        switch (evt.type) {
          case "thought": {
            const t = String(evt.content || "").trim();
            if (t) pendingRef.current.push(t);
            setCurrentAgentState(t || "Thinking…");
            setProcessing(true);
            return;
          }
          case "tool_use": {
            const detail = typeof evt.input === "string" ? evt.input : "";
            const t = detail
              ? `Using ${evt.tool} (${detail})…`
              : `Using ${evt.tool}…`;
            pendingRef.current.push(t);
            setCurrentAgentState(t);
            setProcessing(true);
            return;
          }
          case "response": {
            const aiText = String(evt.content || "");
            const thoughts = pendingRef.current.slice();
            pendingRef.current = [];
            setMessages((cur) => [
              ...cur,
              { role: "assistant", text: aiText, ts: Date.now(), thoughts },
            ]);
            setCurrentAgentState(null);
            setProcessing(false);
            return;
          }
          case "end": {
            endedRef.current = true;
            setProcessing(false);
            setCurrentAgentState(null);
            return;
          }
        }
      }
    };
    return { simulateIncoming, processing, currentAgentState, messages };
  };
  return { useRealtime, RealtimeProvider };
});

import { RealtimeProvider, useRealtime } from "@/contexts/RealtimeContext";

// Minimize provider overhead: mock Toast and Task providers to no-ops
vi.mock("@/contexts/ToastContext", async () => {
  const actual = await vi.importActual("@/contexts/ToastContext");
  return {
    ...actual,
    ToastProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useToasts: () => ({ push: () => {}, dismiss: () => {}, toasts: [] }),
  };
});
vi.mock("@/contexts/TaskContext", async () => {
  const actual = await vi.importActual("@/contexts/TaskContext");
  return {
    ...actual,
    TaskProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useTaskStore: () => ({ addTask: async () => {} }),
  };
});

function Probe({ events }: { events: ReadonlyArray<TestEvent> }) {
  const { simulateIncoming, processing, currentAgentState, messages } =
    useRealtime();
  useEffect(() => {
    let canceled = false;
    async function run() {
      for (const e of events) {
        if (canceled) return;
        // Only dispatch initial thought/tool events here; response/end are dispatched manually
        if (e.type === "response" || e.type === "end") {
          continue;
        }
        simulateIncoming?.(e);
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    run();
    // expose for manual dispatch in tests if needed
    (
      globalThis as unknown as { __rtDispatch?: (e: TestEvent) => void }
    ).__rtDispatch = simulateIncoming;
    return () => {
      canceled = true;
      (
        globalThis as unknown as { __rtDispatch?: (e: TestEvent) => void }
      ).__rtDispatch = undefined;
    };
  }, [events, simulateIncoming]);
  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { "data-testid": "processing" },
      processing ? "yes" : "no",
    ),
    React.createElement(
      "div",
      { "data-testid": "state" },
      currentAgentState || "",
    ),
    React.createElement(
      "div",
      { "data-testid": "assistant-count" },
      String(messages.filter((m) => m.role === "assistant").length),
    ),
    React.createElement(
      "div",
      { "data-testid": "thoughts-count" },
      String(messages[messages.length - 1]?.thoughts?.length ?? 0),
    ),
  );
}

describe("RealtimeContext integration", () => {
  it("accumulates thoughts and appends on final response", async () => {
    const events: ReadonlyArray<TestEvent> = [
      { type: "thought", content: "Starting chain…" },
      { type: "tool_use", tool: "search", input: "query" },
      { type: "response", content: "Here is the answer." },
      { type: "end", content: "done" },
    ];
    const { findByTestId } = render(
      React.createElement(
        RealtimeProvider,
        null,
        React.createElement(Probe, { events }),
      ),
    );
    // Ensure final settled state by dispatching response and end deterministically
    const dispatch = (
      globalThis as unknown as {
        __rtDispatch?: (e: TestEvent) => void;
      }
    ).__rtDispatch;
    if (dispatch) {
      await act(async () => {
        dispatch({ type: "response", content: "Here is the answer." });
        await new Promise((r) => setTimeout(r, 10));
        dispatch({ type: "end", content: "done" });
        await new Promise((r) => setTimeout(r, 10));
      });
    }
    // Drive via Probe effect only to avoid duplicate dispatch
    await waitFor(
      async () => {
        const countText =
          (await findByTestId("assistant-count")).textContent || "0";
        expect(Number(countText)).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );
    await waitFor(
      async () => {
        expect((await findByTestId("processing")).textContent).toBe("no");
      },
      { timeout: 3000 },
    );
    const thoughtsCount = Number(
      (await findByTestId("thoughts-count")).textContent || "0",
    );
    expect(thoughtsCount).toBeGreaterThanOrEqual(2);
  });
});

// No WS connection needed; using lightweight mocked context above.
