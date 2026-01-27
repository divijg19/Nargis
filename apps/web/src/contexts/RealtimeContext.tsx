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
import { buildEvent, emitDomainEvent } from "@/events/dispatcher";
import { isFlagEnabled } from "@/flags/flags";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { sanitizeText } from "@/lib/sanitize";
import { RealtimeConnection } from "@/realtime/connection";
import type { AgentEvent } from "@/types";
import { useAuth } from "./AuthContext";
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
  messages: Array<{
    role: "user" | "assistant";
    text: string;
    ts: number;
    thoughts?: string[];
  }>;
  clearMessages: () => void;
  /** Insert a user message into the conversation programmatically */
  sendUserMessage: (text: string) => void;
  openConversation: boolean;
  setOpenConversation: (v: boolean) => void;
  // NEW: agent streaming state
  currentAgentState: string | null;
  processing: boolean;
  capabilities: {
    canChatEphemeral: boolean;
    canStream: boolean;
    canPersist: boolean;
    canExecuteAgents: boolean;
  };
  // Voice mode: chat (anonymous-safe) vs agent (requires auth)
  voiceMode: "chat" | "agent";
  setVoiceMode: (m: "chat" | "agent") => void;
  // dev helper to inject messages into the same handling logic (useful for testing)
  simulateIncoming?: (msg: unknown) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

// Normalize assistant-facing text to prefer plain English. If the input looks
// like a JSON/object dump, perform an additional `stripJson` pass so the UI
// never renders raw model dicts.
function normalizeAssistantText(input: unknown): string {
  const s = sanitizeText(input);
  // crude heuristic for JSON/object-like payloads
  const looksLikeJson = /[{[\]"]|\bchoices\b|\bmessage\b|\bcontent\b/i;
  if (looksLikeJson.test(s)) return sanitizeText(s, 20000, true);
  return s;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [connectionStatus, setConnectionStatus] =
    useState<RealtimeContextValue["connectionStatus"]>("idle");
  // Recording is handled by useMediaRecorder hook
  const { start, stop, isRecording } = useMediaRecorder();
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  // Conversation history (user / assistant messages)
  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      ts: number;
      thoughts?: string[];
    }>
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
  const BASE_STORAGE_KEY = "nargis:ai:messages:v1";
  const storageKey = useMemo(() => {
    if (!isAuthenticated || !user?.id) return null;
    return `${BASE_STORAGE_KEY}:${user.id}`;
  }, [isAuthenticated, user?.id]);

  // NEW: Agent state
  const [currentAgentState, setCurrentAgentState] = useState<string | null>(
    null,
  );
  const [processing, setProcessing] = useState<boolean>(false);

  // Streaming buffer for partial assistant text; commit to history only on `end`.
  const responseBufferRef = useRef<string>("");
  const streamActiveRef = useRef<boolean>(false);

  // Capability flags determine what the current client environment allows.
  // Auth gates persistence and agent execution only; ephemeral chat and
  // streaming are available regardless of authentication (subject to
  // feature flags / provisioning).
  const capabilities = useMemo(() => {
    const envEnable = String(process.env.NEXT_PUBLIC_ENABLE_WS || "0") === "1";
    const streamEnabled = isFlagEnabled("realtime") || envEnable;
    return {
      canChatEphemeral: true,
      canStream: streamEnabled,
      canPersist: Boolean(isAuthenticated && user?.id),
      canExecuteAgents: Boolean(isAuthenticated && user?.id),
    };
  }, [isAuthenticated, user?.id]);

  // Voice mode defaults to anonymous-safe chat.
  const [voiceMode, setVoiceMode] = useState<"chat" | "agent">("chat");

  // Accumulate thoughts during a streaming session until a final response
  const pendingThoughtsRef = useRef<string[]>([]);
  // Marks whether we've already seen a terminal event for the current stream.
  // When true, the UI will ignore late events from the server for this turn.
  const terminalSeenRef = useRef<boolean>(false);

  // If the user logs out, force mode back to chat.
  useEffect(() => {
    if (!isAuthenticated && voiceMode !== "chat") {
      setVoiceMode("chat");
    }
  }, [isAuthenticated, voiceMode]);

  // Centralized incoming message handler (used for both real WS messages and
  // dev/testing injections). Kept stable via useCallback so it can be used
  // outside the connection effect.
  const handleIncoming = useCallback(
    (msg: unknown) => {
      // Ignore any late events after we've observed a terminal event for the
      // current stream. This prevents duplicates and racey ordering when the
      // gateway sends a fast 'end' following a STOP while buffered NDJSON
      // lines still arrive from upstream.
      if (terminalSeenRef.current) return;

      // This is where we receive the final, processed response from the backend.
      console.debug("[Realtime] AI Response Received:", msg);

      // NEW: handle AgentEvent NDJSON shape
      if (typeof msg === "object" && msg !== null) {
        const maybe = msg as Record<string, unknown>;
        if ("type" in maybe) {
          const evt = maybe as AgentEvent;
          switch (evt.type) {
            case "transcript": {
              const t = sanitizeText(evt.content);
              if (t) {
                setTranscribedText(t);
                setMessages((cur) => [
                  ...cur,
                  { role: "user", text: t, ts: Date.now() },
                ]);
                setOpenConversation(true);
              }
              return;
            }
            case "thought": {
              const t = String(evt.content || "").trim();
              if (t) pendingThoughtsRef.current.push(t);
              // show transient thinking hint
              setCurrentAgentState(t || "Thinking…");
              setProcessing(true);
              // do not append to final history yet
              return;
            }
            case "tool_use": {
              // Safe narrow: only tool_use variant has input
              const detail =
                evt.type === "tool_use" && typeof evt.input === "string"
                  ? evt.input
                  : "";
              const t = detail
                ? `Using ${evt.tool} (${detail})…`
                : `Using ${evt.tool}…`;
              pendingThoughtsRef.current.push(t);
              setCurrentAgentState(t);
              setProcessing(true);
              return;
            }
            case "tool_result": {
              // Emit domain event so other contexts can refresh data
              const toolName = evt.tool;
              const toolResult =
                typeof evt.result === "string"
                  ? evt.result
                  : typeof evt.output === "string"
                    ? evt.output
                    : "";
              console.debug("[Realtime] Tool completed:", toolName);
              emitDomainEvent(
                buildEvent("remote.tool_completed", {
                  tool: toolName,
                  result: toolResult,
                }),
              );
              return;
            }
            case "response": {
              // Buffer partial response text; show as transient `aiResponse`.
              const chunk = sanitizeText(evt.content);
              // mark stream active
              streamActiveRef.current = true;
              // accumulate
              responseBufferRef.current =
                (responseBufferRef.current || "") + chunk;
              setAiResponse(responseBufferRef.current);
              // keep processing true until we see `end`
              setProcessing(true);
              setOpenConversation(true);
              return;
            }
            case "error":
              pendingThoughtsRef.current = [];
              push({ message: String(evt.content), variant: "error" });
              setCurrentAgentState(null);
              setProcessing(false);
              return;
            case "end":
              // Upstream signaled end-of-stream; mark terminal observed and
              // clear processing. Only handle the first terminal event.
              terminalSeenRef.current = true;
              setCurrentAgentState(null);
              // Commit buffered response to message history as a single assistant block
              try {
                const rawFinal =
                  responseBufferRef.current || String(evt.content || "");
                const finalText = sanitizeText(rawFinal, 20000, true);
                if (finalText?.trim()) {
                  const thoughts = pendingThoughtsRef.current.slice();
                  pendingThoughtsRef.current = [];
                  // defensively normalize to avoid raw JSON-like blobs
                  const normalized = normalizeAssistantText(finalText);
                  setMessages((cur) => [
                    ...cur,
                    {
                      role: "assistant",
                      text: normalized,
                      ts: Date.now(),
                      thoughts,
                    },
                  ]);
                  // Ensure the final aiResponse reflects the committed text
                  setAiResponse(normalized);
                }
              } finally {
                // Reset streaming state
                responseBufferRef.current = "";
                streamActiveRef.current = false;
                setProcessing(false);
              }
              try {
                const content = String(evt.content || "").toLowerCase();
                if (
                  content.includes("canceled") ||
                  content.includes("cancelled")
                ) {
                  push({
                    message: "Canceled",
                    variant: "warning",
                    type: "stream-canceled",
                  });
                }
              } catch {
                /* noop */
              }
              return;
            // fallthrough to legacy handlers otherwise
          }
        }
      }

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
        const cleanTranscript = sanitizeText(o.transcript as string);
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
              const normalized = normalizeAssistantText(aiText);
              setAiResponse(normalized);
              setMessages((cur) => [
                ...cur,
                { role: "assistant", text: normalized, ts: Date.now() },
              ]);
            } else {
              // Attempt to extract likely assistant text from common keys
              let aiText = "";
              try {
                const lobj = llm as Record<string, unknown>;
                // OpenAI/Groq schema: safely inspect first choice
                if (Array.isArray(lobj.choices)) {
                  const firstChoice = lobj.choices[0];
                  if (typeof firstChoice === "object" && firstChoice !== null) {
                    const msg = (firstChoice as Record<string, unknown>)
                      .message;
                    if (
                      typeof msg === "object" &&
                      msg !== null &&
                      "content" in msg
                    ) {
                      aiText = String((msg as Record<string, unknown>).content);
                    }
                  }
                }
                if (!aiText && typeof lobj.reply === "string") {
                  aiText = lobj.reply;
                } else if (!aiText && typeof lobj.output === "string") {
                  aiText = lobj.output;
                } else if (!aiText && typeof lobj.text === "string") {
                  aiText = lobj.text;
                } else if (!aiText) {
                  // Last-resort: stringify then strip JSON punctuation
                  aiText = sanitizeText(String(lobj), 20000, true);
                }
              } catch {
                aiText = sanitizeText(String(llm), 20000, true);
              }
              aiText = sanitizeText(aiText);
              const normalized = normalizeAssistantText(aiText);
              setAiResponse(normalized);
              setMessages((cur) => [
                ...cur,
                { role: "assistant", text: normalized, ts: Date.now() },
              ]);
            }
          } else {
            // Attempt to extract likely assistant text from common keys
            let aiText = "";
            try {
              const lobj = llm as Record<string, unknown>;
              if (Array.isArray(lobj.choices)) {
                const firstChoice = lobj.choices[0];
                if (typeof firstChoice === "object" && firstChoice !== null) {
                  const msg = (firstChoice as Record<string, unknown>).message;
                  if (
                    typeof msg === "object" &&
                    msg !== null &&
                    "content" in msg
                  ) {
                    aiText = String((msg as Record<string, unknown>).content);
                  }
                }
              }
              if (!aiText && typeof lobj.reply === "string") {
                aiText = lobj.reply;
              } else if (!aiText && typeof lobj.output === "string") {
                aiText = lobj.output;
              } else if (!aiText && typeof lobj.text === "string") {
                aiText = lobj.text;
              } else if (!aiText) {
                aiText = sanitizeText(String(lobj), 20000, true);
              }
            } catch {
              aiText = sanitizeText(String(llm), 20000, true);
            }
            aiText = sanitizeText(aiText);
            const normalized = normalizeAssistantText(aiText);
            setAiResponse(normalized);
            setMessages((cur) => [
              ...cur,
              { role: "assistant", text: normalized, ts: Date.now() },
            ]);
          }
        } else if (typeof llm === "string") {
          const aiText = sanitizeText(llm);
          const normalized = normalizeAssistantText(aiText);
          setAiResponse(normalized);
          setMessages((cur) => [
            ...cur,
            { role: "assistant", text: normalized, ts: Date.now() },
          ]);
        } else {
          const aiText = sanitizeText(String(llm));
          const normalized = normalizeAssistantText(aiText);
          setAiResponse(normalized);
          setMessages((cur) => [
            ...cur,
            { role: "assistant", text: normalized, ts: Date.now() },
          ]);
        }
        return;
      }

      if (isAIResponse(msg)) {
        const m = msg as {
          choices?: Array<{ message?: { content?: unknown } }>;
          error?: unknown;
          detail?: unknown;
        };
        if (Array.isArray(m.choices) && m.choices[0]?.message?.content) {
          const aiText = sanitizeText(m.choices[0].message.content);
          const normalized = normalizeAssistantText(aiText);
          setAiResponse(normalized);
          setMessages((cur) => [
            ...cur,
            { role: "assistant", text: normalized, ts: Date.now() },
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
    },
    [push],
  );

  // Effect to establish and manage the WebSocket connection on component mount.
  useEffect(() => {
    // Enable realtime only if the feature flag is on OR if the explicit
    // environment opt-in `NEXT_PUBLIC_ENABLE_WS=1` is set. `NEXT_PUBLIC_WS_URL`
    // remains a provisioning override for the URL but will not enable WS by
    // itself. This reduces accidental reliance on WS in production.
    const envEnable = String(process.env.NEXT_PUBLIC_ENABLE_WS || "0") === "1";
    const _hasWsUrl = Boolean(process.env.NEXT_PUBLIC_WS_URL);
    const enabled = isFlagEnabled("realtime") || envEnable;
    if (!enabled) return;

    const defaultUrl = (() => {
      if (typeof window === "undefined") return "ws://localhost:8080/ws";
      if (process.env.NODE_ENV === "production") {
        const proto = window.location.protocol === "https:" ? "wss" : "ws";
        return `${proto}://${window.location.host}/ws`;
      }
      return "ws://localhost:8080/ws";
    })();

    const url = process.env.NEXT_PUBLIC_WS_URL || defaultUrl;
    // Security: do not append auth tokens to the WS URL.
    console.debug("[Realtime] initializing connection");
    const conn = new RealtimeConnection({ url, maxRetries: 6 });
    connectionRef.current = conn;

    conn.onStatus(setConnectionStatus);

    // Use the centralized incoming handler for all messages (real WS)
    conn.onMessage((m) => handleIncoming(m));

    // Clean up the connection when the component unmounts.
    return () => conn.close();
  }, [handleIncoming]);

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
        push({
          message: "Transcript ready",
          variant: "info",
          type: "transcript-ready",
        });
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

  // Toggle `.is-voice-active` on the document root while recording or processing.
  useEffect(() => {
    try {
      const root = typeof document !== "undefined" && document.documentElement;
      if (!root) return;
      const active = isRecording || processing;
      if (active) root.classList.add("is-voice-active");
      else root.classList.remove("is-voice-active");
      return () => root.classList.remove("is-voice-active");
    } catch {
      /* noop */
    }
  }, [isRecording, processing]);

  // Notify users when the realtime connection status changes (connect/retry/error)
  useEffect(() => {
    if (!lastConnRef.current || lastConnRef.current !== connectionStatus) {
      lastConnRef.current = connectionStatus;
      if (connectionStatus === "open") {
        push({
          message: "Connected to realtime service",
          variant: "success",
          type: "reconnected",
        });
      } else if (connectionStatus === "retrying") {
        // Inform about reconnect attempts but avoid adding a 'connecting' toast
        // which tends to be noisy when users are actively interacting.
        push({
          message: "Reconnecting to realtime service...",
          variant: "info",
          type: "reconnecting",
        });
      } else if (
        connectionStatus === "error" ||
        connectionStatus === "closed"
      ) {
        push({
          message: "Realtime connection lost.",
          variant: "warning",
          type: "connection-error",
        });
      }
    }
    // only run when connectionStatus or push changes
  }, [connectionStatus, push]);

  // The AI modal is rendered by consumers when `aiResponse` or `transcribedText`
  // are non-null. No additional effect is required here.

  // Auto-open the conversation modal when we receive a transcript or AI response
  useEffect(() => {
    if ((transcribedText || aiResponse) && !openConversation) {
      setOpenConversation(true);
    }
    // Intentionally only depend on these values to auto-open when new data arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcribedText, aiResponse, openConversation]);

  // Auth-gated persistence:
  // - Anonymous: keep history in-memory only (resets on refresh/tab close).
  // - Authenticated: load+persist history scoped by user id.
  const migratedOnLoginRef = useRef(false);

  // Load persisted conversation when a user becomes authenticated (or changes).
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!storageKey) return;
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{
        role: "user" | "assistant";
        text: string;
        ts: number;
        thoughts?: string[];
      }>;
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch (e) {
      console.warn("Could not load persisted conversation", e);
    }
  }, [storageKey]);

  // Migrate in-memory anonymous history into persisted storage on login.
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!storageKey) return;
      if (!isAuthenticated) {
        migratedOnLoginRef.current = false;
        return;
      }

      if (!migratedOnLoginRef.current && messages.length > 0) {
        window.localStorage.setItem(storageKey, JSON.stringify(messages));
        migratedOnLoginRef.current = true;
      }
    } catch (e) {
      console.warn("Could not migrate conversation on login", e);
    }
  }, [isAuthenticated, messages, storageKey]);

  // Persist conversation whenever messages change (authenticated only).
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!storageKey) return;
      if (!isAuthenticated) return;
      window.localStorage.setItem(storageKey, JSON.stringify(messages || []));
    } catch (e) {
      console.warn("Could not persist conversation", e);
    }
  }, [messages, storageKey, isAuthenticated]);

  // Allow programmatic insertion of a user message (e.g., from UI prompts)
  const sendUserMessage = useCallback((text: string) => {
    if (!text) return;
    const clean = sanitizeText(text);
    setMessages((cur) => [
      ...cur,
      { role: "user", text: clean, ts: Date.now() },
    ]);
    setOpenConversation(true);
  }, []);

  const startListening = useCallback(async () => {
    if (isRecording) return;

    // Reset terminal marker for a fresh turn.
    terminalSeenRef.current = false;

    // Enforce auth for execution/agent mode.
    if (voiceMode === "agent" && !isAuthenticated) {
      push({
        message: "Sign in to use execution mode.",
        variant: "warning",
        type: "auth-required",
      });
      return;
    }

    // If connection isn't ready, attempt to wait for it to open briefly so
    // the user can press the voice button and the app will try to connect.
    if (connectionStatus !== "open") {
      let conn = connectionRef.current;
      if (!conn) {
        const defaultUrl = (() => {
          if (typeof window === "undefined") return "ws://localhost:8080/ws";
          if (process.env.NODE_ENV === "production") {
            const proto = window.location.protocol === "https:" ? "wss" : "ws";
            return `${proto}://${window.location.host}/ws`;
          }
          return "ws://localhost:8080/ws";
        })();
        const url = process.env.NEXT_PUBLIC_WS_URL || defaultUrl;
        conn = new RealtimeConnection({ url, maxRetries: 6 });
        connectionRef.current = conn;
        conn.onStatus(setConnectionStatus);

        // ensure the central handler is wired when we create a connection on-demand
        conn.onMessage((m) => handleIncoming(m));
      }

      const opened = await new Promise<boolean>((resolve) => {
        let settled = false;
        const unsub = conn?.onStatus((s) => {
          if (s === "open") {
            settled = true;
            try {
              unsub();
            } catch {}
            resolve(true);
          }
        });
        setTimeout(() => {
          if (!settled) {
            try {
              unsub();
            } catch {}
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

    // Inform the gateway which mode this turn should use.
    try {
      connectionRef.current?.send(`MODE:${voiceMode}`);
    } catch {
      /* best-effort */
    }

    try {
      // Clear any previous conversation state immediately so the UI resets
      setAiResponse(null);
      setTranscribedText(null);
      pendingThoughtsRef.current = [];
      setCurrentAgentState(null);
      setProcessing(false);

      await start(
        async (data: Blob) => {
          if (data && connectionRef.current) {
            connectionRef.current.send(data);
          }
        },
        () => {
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
  }, [
    isRecording,
    voiceMode,
    isAuthenticated,
    connectionStatus,
    push,
    start,
    handleIncoming,
  ]);

  const stopListening = useCallback(() => {
    if (!isRecording) return;
    try {
      // Request upstream cancellation immediately (barge-in)
      connectionRef.current?.send("STOP");
    } catch {
      /* ignore */
    }
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
  const value = useMemo(() => {
    const v: RealtimeContextValue = {
      connectionStatus,
      isListening: Boolean(isRecording),
      startListening,
      stopListening,
      aiResponse,
      transcribedText,
      voiceMode,
      setVoiceMode,
      clearTranscribedText,
      clearAiResponse,
      messages,
      clearMessages,
      openConversation,
      sendUserMessage,
      setOpenConversation,
      currentAgentState,
      processing,
      // Note: `capabilities` is included below in the returned object but
      // not typed on the shallow RealtimeContextValue to avoid circular refs
      // in this handwritten value. We'll spread capabilities in via cast.
      // Dev/testing helper
      simulateIncoming:
        typeof window !== "undefined"
          ? (msg: unknown) => handleIncoming(msg)
          : undefined,
      // Attach capability flags describing allowed operations in this session.
      capabilities,
    } as unknown as RealtimeContextValue;

    return v;
  }, [
    connectionStatus,
    isRecording,
    startListening,
    stopListening,
    aiResponse,
    transcribedText,
    voiceMode,
    messages,
    clearMessages,
    openConversation,
    sendUserMessage,
    clearTranscribedText,
    clearAiResponse,
    handleIncoming,
    currentAgentState,
    processing,
    capabilities,
  ]);

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
