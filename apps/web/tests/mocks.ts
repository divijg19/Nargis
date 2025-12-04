import { vi } from "vitest";

// Shared spies
export const stopListeningMock = vi.fn();

// Mock RealtimeContext
vi.mock("@/contexts/RealtimeContext", async () => {
  type RealtimeModule = typeof import("@/contexts/RealtimeContext");
  const actual = (await vi.importActual(
    "@/contexts/RealtimeContext",
  )) as unknown as RealtimeModule;
  return {
    ...actual,
    useRealtime: () => ({
      aiResponse: null,
      transcribedText: null,
      clearAiResponse: () => {},
      clearTranscribedText: () => {},
      messages: [],
      openConversation: true,
      setOpenConversation: () => {},
      clearMessages: () => {},
      simulateIncoming: () => {},
      isListening: false,
      currentAgentState: "Thinking…",
      processing: true,
      stopListening: stopListeningMock,
      startListening: () => {},
      sendUserMessage: () => {},
      connectionStatus: "open",
    }),
  };
});

// Mock Toasts
vi.mock("@/contexts/ToastContext", async () => {
  type ToastModule = typeof import("@/contexts/ToastContext");
  const actual = (await vi.importActual(
    "@/contexts/ToastContext",
  )) as unknown as ToastModule;
  return {
    ...actual,
    useToasts: () => ({
      push: () => "toast-id",
      dismiss: () => {},
      toasts: [],
    }),
  };
});

// Mock Task store
vi.mock("@/contexts/TaskContext", async () => {
  type TaskModule = typeof import("@/contexts/TaskContext");
  const actual = (await vi.importActual(
    "@/contexts/TaskContext",
  )) as unknown as TaskModule;
  return {
    ...actual,
    useTaskStore: () => ({
      addTask: async () => {},
    }),
  };
});

// Mock ChatPanel component to a minimal button triggering stopListening
// Intentionally do not mock ChatPanel here so real-component tests can use
// renderWithProviders to supply actual contexts.
