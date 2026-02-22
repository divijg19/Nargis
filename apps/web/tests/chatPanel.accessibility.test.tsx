import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const realtimeState: {
  aiResponse: string | null;
  transcribedText: string | null;
  clearAiResponse: () => void;
  clearTranscribedText: () => void;
  messages: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
  clearMessages: () => void;
  simulateIncoming?: (msg: unknown) => void;
  isListening: boolean;
  stopListening: () => void;
  currentAgentState: string | null;
  processing: boolean;
  voiceMode: "chat" | "agent";
  setVoiceMode: (m: "chat" | "agent") => void;
  capabilities: {
    canExecuteAgents: boolean;
  };
} = {
  aiResponse: null,
  transcribedText: null,
  clearAiResponse: () => {},
  clearTranscribedText: () => {},
  messages: [],
  clearMessages: () => {},
  simulateIncoming: () => {},
  isListening: false,
  stopListening: () => {},
  currentAgentState: null,
  processing: false,
  voiceMode: "chat",
  setVoiceMode: () => {},
  capabilities: {
    canExecuteAgents: true,
  },
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: "u-1" },
  }),
}));

vi.mock("@/contexts/RealtimeContext", () => ({
  useRealtime: () => realtimeState,
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToasts: () => ({ push: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

vi.mock("@/contexts/TaskContext", () => ({
  useTaskStore: () => ({ addTask: vi.fn(async () => {}) }),
}));

import ChatPanel from "@/components/ui/ChatPanel";

describe("ChatPanel accessibility announcements", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    realtimeState.aiResponse = null;
    realtimeState.transcribedText = null;
    realtimeState.messages = [];
    realtimeState.isListening = false;
    realtimeState.processing = false;
  });

  it("announces one assistant turn once and keeps a single assistant message node", () => {
    realtimeState.messages = [
      { role: "user", text: "hello", ts: 1000 },
      { role: "assistant", text: "Turn complete", ts: 2000 },
    ];

    const { rerender, container } = render(<ChatPanel merged={false} />);

    const log = screen.getByRole("log");
    expect(log.querySelectorAll(".message--assistant")).toHaveLength(1);
    expect(
      screen.getAllByText("Assistant response: Turn complete"),
    ).toHaveLength(1);

    rerender(<ChatPanel merged={false} />);

    expect(container.querySelectorAll(".message--assistant")).toHaveLength(1);
    expect(
      screen.getAllByText("Assistant response: Turn complete"),
    ).toHaveLength(1);
  });

  it("updates voice-state live region once per state transition", () => {
    realtimeState.messages = [
      { role: "assistant", text: "Initial response", ts: 3000 },
    ];

    const { rerender } = render(<ChatPanel merged={false} />);

    realtimeState.isListening = true;
    rerender(<ChatPanel merged={false} />);
    expect(screen.getAllByText("Listening")).toHaveLength(1);

    rerender(<ChatPanel merged={false} />);
    expect(screen.getAllByText("Listening")).toHaveLength(1);

    realtimeState.isListening = false;
    realtimeState.processing = true;
    rerender(<ChatPanel merged={false} />);
    expect(screen.getAllByText("Processing request")).toHaveLength(1);

    rerender(<ChatPanel merged={false} />);
    expect(screen.getAllByText("Processing request")).toHaveLength(1);

    realtimeState.processing = false;
    rerender(<ChatPanel merged={false} />);
    expect(screen.queryByText("Processing request")).toBeNull();
  });

  it("does not render raw JSON-like assistant text nodes", () => {
    realtimeState.aiResponse =
      '{"choices":[{"message":{"content":"Hello world"}}]}';

    render(<ChatPanel merged={false} />);

    expect(
      screen.queryByText('{"choices":[{"message":{"content":"Hello world"}}]}'),
    ).toBeNull();
    expect(
      screen.getByText(/choices:message:content:Hello world/i),
    ).toBeInTheDocument();
  });
});
