"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isFlagEnabled } from "@/flags/flags";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { sanitizeText } from "@/lib/sanitize";
import { RealtimeConnection } from "@/realtime/connection";
import { useToasts } from "./ToastContext";

// Narrow incoming messages safely (top-level to avoid hook deps)
function isAIResponse(obj: unknown): obj is {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: unknown;
  detail?: unknown;
} {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (Array.isArray(o.choices)) return true;
  if ("error" in o || "detail" in o) return true;
  return false;
}

function isTranscriptLLM(
  obj: unknown,
): obj is { transcript: string; llm: unknown } {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.transcript === "string" && "llm" in o;
}

// Define the shape of the data that the context will provide to the UI.
interface RealtimeContextValue {
  connectionStatus:
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error"
  | "retrying";
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  aiResponse: string | null;
  clearAiResponse: () => void;
  transcribedText: string | null;
  clearTranscribedText: () => void;
  // Conversation history exposed to UI
  messages: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
  clearMessages: () => void;
  openConversation: boolean;
  setOpenConversation: (v: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeContextValue["connectionStatus"]>("idle");
  // Recording is handled by useMediaRecorder hook
  const { start, stop, isRecording } = useMediaRecorder();
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  // Conversation history (user / assistant messages)
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string; ts: number }>
  >([]);
  const [openConversation, setOpenConversation] = useState(false);
  const { push } = useToasts();
  const lastConnRef = useRef<RealtimeContextValue["connectionStatus"] | null>(
    null,
  );
  const lastTranscriptRef = useRef<{ text: string; ts: number } | null>(null);

  // Use refs to hold objects that shouldn't trigger re-renders when they change,
  // like the connection and media recorder instances.
  const connectionRef = useRef<RealtimeConnection | null>(null);

  // use top-level isAIResponse helper

  // Effect to establish and manage the WebSocket connection on component mount.
  useEffect(() => {
    // Enable realtime if the feature flag is on OR if a WS url is explicitly
    // provided via NEXT_PUBLIC_WS_URL. This lets dev and prod opt-ins work
    // without needing to toggle flags in every environment.
    const hasWsUrl = Boolean(process.env.NEXT_PUBLIC_WS_URL);
    const enabled = isFlagEnabled("realtime") || hasWsUrl;
    if (!enabled) return;

    const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
    console.debug("[Realtime] initializing connection to", url);
    const conn = new RealtimeConnection({ url, maxRetries: 6 });
    connectionRef.current = conn;

    conn.onStatus(setConnectionStatus);

    conn.onMessage((msg) => {
      // This is where we receive the final, processed response from the backend.
      console.debug("[Realtime] AI Response Received:", msg);
      // Support simple string messages as interim transcripts from the server.
      if (typeof msg === "string") {
        // interim transcripts — show live text but do not add to history until
        // we receive a final transcript embedded in an LLM payload.
        setTranscribedText(sanitizeText(msg));
        return;
      }
      // If the backend returns the transcript alongside the llm result, handle both.
      if (isTranscriptLLM(msg)) {
        const o = msg as Record<string, unknown>;
        const cleanTranscript = sanitizeText(o.transcript);
        setTranscribedText(cleanTranscript);
        // push user message to history
        setMessages((cur) => [
          ...cur,
          { role: "user", text: cleanTranscript, ts: Date.now() },
        ]);
        const llm = o.llm;
        if (typeof llm === "object" && llm !== null) {
          const l = llm as Record<string, unknown>;
          if (Array.isArray(l.choices)) {
            const first = l.choices[0] as Record<string, unknown> | undefined;
            const message = first?.message as
              | Record<string, unknown>
              | undefined;
            if (message && "content" in message) {
              const aiText = sanitizeText(message.content);
              setAiResponse(aiText);
              setMessages((cur) => [
                ...cur,
                { role: "assistant", text: aiText, ts: Date.now() },
              ]);
            } else {
              const raw = sanitizeText(JSON.stringify(llm));
              setAiResponse(raw);
              setMessages((cur) => [
                ...cur,
                { role: "assistant", text: raw, ts: Date.now() },
              ]);
            }
          } else {
            const raw = sanitizeText(JSON.stringify(llm));
            setAiResponse(raw);
            setMessages((cur) => [
              ...cur,
              { role: "assistant", text: raw, ts: Date.now() },
            ]);
          }
        } else if (typeof llm === "string") {
          const aiText = sanitizeText(llm);
          setAiResponse(aiText);
          setMessages((cur) => [
            ...cur,
            { role: "assistant", text: aiText, ts: Date.now() },
          ]);
        } else {
          const aiText = sanitizeText(String(llm));
          setAiResponse(aiText);
          setMessages((cur) => [
            ...cur,
            { role: "assistant", text: aiText, ts: Date.now() },
          ]);
        }
        return;
      }

      if (isAIResponse(msg)) {
        const m = msg;
        if (Array.isArray(m.choices) && m.choices[0]?.message?.content) {
          const aiText = sanitizeText(m.choices[0].message.content);
          setAiResponse(aiText);
          setMessages((cur) => [
            ...cur,
            { role: "assistant", text: aiText, ts: Date.now() },
          ]);
          return;
        }
        if (m.error || m.detail) {
          push({
            message: `Error from AI: ${String(m.detail || m.error)}`,
            variant: "error",
          });
          setAiResponse(null);
          return;
        }
      }
      // ignore unexpected message shapes
    });

    // Clean up the connection when the component unmounts.
    return () => conn.close();
  }, [push]);

  // Announce when a transcript becomes available (subtle toast to reassure users)
  useEffect(() => {
    if (transcribedText) {
      const now = Date.now();
      const txt = transcribedText;
      // Only push when text changes or if it's been >3s since last similar toast
      if (
        !lastTranscriptRef.current ||
        lastTranscriptRef.current.text !== txt ||
        now - lastTranscriptRef.current.ts > 3000
      ) {
        push({ message: "Transcript ready", variant: "info" });
        lastTranscriptRef.current = { text: txt, ts: now };
      }
    }
  }, [transcribedText, push]);

  const clearMessages = useCallback(() => setMessages([]), []);

  // Mirror short announcements to an aria-live region for screen readers and
  // visually-hidden assistive announcements. Keeps users informed about
  // transcripts and AI responses without intrusive modals.
  useEffect(() => {
    try {
      const node =
        typeof document !== "undefined" &&
        document.getElementById("voice-announcements");
      if (!node) return;
      if (transcribedText && !aiResponse) {
        node.textContent = `Transcript ready: ${transcribedText.slice(0, 160)}`;
      } else if (aiResponse) {
        node.textContent = `AI response ready.`;
      } else {
        node.textContent = "";
      }
    } catch {
      /* noop - accessibility best-effort */
    }
  }, [transcribedText, aiResponse]);

  // Notify users when the realtime connection status changes (connect/retry/error)
  useEffect(() => {
    if (!lastConnRef.current || lastConnRef.current !== connectionStatus) {
      lastConnRef.current = connectionStatus;
      if (connectionStatus === "open") {
        push({ message: "Connected to realtime service", variant: "success" });
      } else if (connectionStatus === "retrying") {
        // Inform about reconnect attempts but avoid adding a 'connecting' toast
        // which tends to be noisy when users are actively interacting.
        push({ message: "Reconnecting to realtime service...", variant: "info" });
      } else if (connectionStatus === "error" || connectionStatus === "closed") {
        push({ message: "Realtime connection lost.", variant: "warning" });
      }
    }
    // only run when connectionStatus or push changes
  }, [connectionStatus, push]);

  // The AI modal is rendered by consumers when `aiResponse` or `transcribedText`
  // are non-null. No additional effect is required here.

  const startListening = useCallback(async () => {
    if (isRecording) return;
    // If connection isn't ready, attempt to wait for it to open briefly so
    // the user can press the voice button and the app will try to connect.
    if (connectionStatus !== "open") {
      // Connection attempt will announce status via the connectionStatus effect.
      // Avoid duplicating toasts here to prevent redundant notifications.
      // Wait up to 4s for the connection to become open. If it doesn't, abort.
      let conn = connectionRef.current;
      // If we don't have a connection yet but a WS URL is configured, create
      // one on-demand so user clicks can initiate a connection without a
      // prior feature-flag toggle.
      if (!conn) {
        // Default to the local gateway if no env var is set — this mirrors the
        // behaviour used during effect-based initialization and makes the UI
        // resilient in typical local dev setups.
        const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
        conn = new RealtimeConnection({ url, maxRetries: 6 });
        connectionRef.current = conn;
        conn.onStatus(setConnectionStatus);
      }
      const opened = await new Promise<boolean>((resolve) => {
        let settled = false;
        const unsub = conn.onStatus((s) => {
          if (s === "open") {
            settled = true;
            unsub();
            resolve(true);
          }
        });
        setTimeout(() => {
          if (!settled) {
            try {
              unsub();
            } catch { }
            resolve(false);
          }
        }, 4000);
      });
      if (!opened) {
        push({
          message: "Could not connect to the real-time service.",
          variant: "error",
        });
        return;
      }
    }
    try {
      // Clear any previous conversation state immediately so the UI resets
      setAiResponse(null);
      setTranscribedText(null);

      await start(
        async (data: Blob) => {
          if (data && connectionRef.current) {
            // Send audio chunks immediately; RealtimeConnection will queue them
            // if the socket isn't open yet.
            connectionRef.current.send(data);
          }
        },
        () => {
          // onStop: send EOS after recorder fully stops
          if (connectionRef.current) {
            connectionRef.current.send("EOS");
            console.debug("Recording stopped, EOS signal sent.");
          }
        },
      );
    } catch (error) {
      console.error("Error accessing microphone:", error);
      push({
        message: "Could not access the microphone. Please grant permission.",
        variant: "error",
      });
    }
  }, [isRecording, connectionStatus, push, start]);

  const stopListening = useCallback(() => {
    if (!isRecording) return;
    stop();
  }, [isRecording, stop]);

  const clearAiResponse = useCallback(() => {
    setAiResponse(null);
    setTranscribedText(null);
  }, []);

  const clearTranscribedText = useCallback(() => {
    setTranscribedText(null);
  }, []);

  // Memoize the context value to avoid unnecessary re-renders in consumers
  const value = useMemo(
    () => ({
      connectionStatus,
      isListening: Boolean(isRecording),
      startListening,
      stopListening,
      aiResponse,
      transcribedText,
      clearTranscribedText,
      clearAiResponse,
      messages,
      clearMessages,
      openConversation,
      setOpenConversation,
    }),
    [
      connectionStatus,
      isRecording,
      startListening,
      stopListening,
      aiResponse,
      transcribedText,
      clearTranscribedText,
      clearAiResponse,
      messages,
      clearMessages,
      openConversation,
    ],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

// A custom hook to make accessing the context's state and functions easy and safe.
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}
