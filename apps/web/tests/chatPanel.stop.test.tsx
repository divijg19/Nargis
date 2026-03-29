import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChatPanel from "@/components/ui/ChatPanel";

const stopListening = vi.fn();

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
  useRealtime: () => ({
    aiResponse: null,
    transcribedText: null,
    clearAiResponse: () => {},
    clearTranscribedText: () => {},
    messages: [],
    clearMessages: () => {},
    simulateIncoming: () => {},
    isListening: false,
    stopListening,
    currentAgentState: "Thinking test…",
    processing: true,
    voiceMode: "chat",
    setVoiceMode: () => {},
    capabilities: {
      canChatEphemeral: true,
      canStream: true,
      canPersist: true,
      canExecuteAgents: true,
    },
    sendUserMessage: () => {},
    startListening: async () => {},
    connectionStatus: "open",
  }),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToasts: () => ({ push: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

function withQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("ChatPanel Stop button", () => {
  afterEach(() => {
    stopListening.mockClear();
  });

  it("renders Stop when processing and triggers stopListening", async () => {
    render(<ChatPanel merged={false} />, {
      wrapper: withQueryClient(),
    });

    fireEvent.click(await screen.findByRole("button", { name: /open/i }));
    const stopBtn = await screen.findByRole("button", {
      name: /stop processing/i,
    });
    fireEvent.click(stopBtn);
    expect(stopListening).toHaveBeenCalledTimes(1);
  });
});
