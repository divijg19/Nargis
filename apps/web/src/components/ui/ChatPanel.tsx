"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useTaskStore } from "@/contexts/TaskContext";
import { useToasts } from "@/contexts/ToastContext";
import { sanitizeText } from "@/lib/sanitize";
import Message from "./Message";

declare global {
  interface Window {
    __nargis_simulate?: () => void;
  }
}

type ChatPanelProps = {
  compact?: boolean;
  /**
   * When `merged` is true the ChatPanel renders as an embedded, unified
   * panel suitable for the hero area: status tiles, live transcript,
   * permission notice and AI response are displayed together.
   */
  merged?: boolean;
  /** When provided, the panel will render the permission denied notice */
  permissionDenied?: boolean;
};

export default function ChatPanel({
  compact = false,
  merged = false,
  permissionDenied = false,
}: ChatPanelProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {
    aiResponse,
    transcribedText,
    clearAiResponse,
    clearTranscribedText,
    messages,
    clearMessages,
    openConversation,
    setOpenConversation,
    simulateIncoming,
    isListening,
    stopListening,
    currentAgentState,
    processing,
    voiceMode,
    setVoiceMode,
    capabilities,
  } = useRealtime();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const [embeddedOpen, setEmbeddedOpen] = useState(true);
  const [showFullAi, setShowFullAi] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const safeAi = sanitizeText(aiResponse);
  const safeTranscript = sanitizeText(transcribedText);
  const DISPLAY_LIMIT = 2000;
  const displayAi = showFullAi ? safeAi : safeAi.slice(0, DISPLAY_LIMIT);
  const displayTranscript = showFullTranscript
    ? safeTranscript
    : safeTranscript.slice(0, DISPLAY_LIMIT);

  const { push } = useToasts();
  const { addTask } = useTaskStore();

  const shouldShowSignInNudge =
    !loading && !isAuthenticated && (messages?.length || 0) > 0;

  const handleModeChange = (m: "chat" | "agent") => {
    if (m === "agent" && !capabilities.canExecuteAgents) {
      const next = pathname || "/";
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setVoiceMode(m);
  };

  // Accessible header id for merged mode
  const headerId = merged ? "chat-merged-header" : undefined;

  // Expose a dev-only global helper so E2E tests can trigger the same
  // simulate flow even if the Simulate button is not visible in the UI.
  useEffect(() => {
    if (typeof window === "undefined" || !simulateIncoming) return;
    // Attach a short-named helper for tests
    window.__nargis_simulate = () => {
      simulateIncoming("hey this is a test");
      setTimeout(
        () => simulateIncoming("hey this is a test, composing more words"),
        300,
      );
      setTimeout(() => {
        simulateIncoming({
          transcript: "Create a task: Prepare slides for Monday meeting at 3pm",
          llm: {
            choices: [
              {
                message: {
                  content:
                    "Sure — I've drafted a task: 'Prepare slides for Monday meeting at 3pm'. Would you like to set a due date?",
                },
              },
            ],
          },
        });
      }, 800);
      setTimeout(() => {
        simulateIncoming({
          choices: [
            {
              message: { content: "Reminder: don't forget to attach charts." },
            },
          ],
        });
      }, 1800);
    };

    return () => {
      try {
        delete window.__nargis_simulate;
      } catch {}
    };
  }, [simulateIncoming]);

  // When the panel is open, attach a MutationObserver to the chat body so
  // we automatically scroll when new message nodes are added. This avoids
  // having to depend on the `messages` array identity in the effect deps.
  useEffect(() => {
    if (!openConversation) return;
    const container =
      panelRef.current?.querySelector<HTMLDivElement>(".chat-body");
    if (!container) return;

    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight;
    };

    // Initially scroll to bottom
    scrollToBottom();

    const obs = new MutationObserver(() => {
      // small timeout to allow rendering to finish
      setTimeout(scrollToBottom, 30);
    });

    obs.observe(container, { childList: true, subtree: true });

    return () => obs.disconnect();
  }, [openConversation]);

  // Keyboard shortcut: when merged, allow Escape to collapse the embedded panel
  useEffect(() => {
    if (!merged) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && embeddedOpen) setEmbeddedOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [merged, embeddedOpen]);

  // If nothing to show and panel closed, render a compact trigger bar.
  // For merged/embedded usage we show a slimmer trigger that expands the
  // embedded panel instead of opening the full conversation drawer.
  if (
    !openConversation &&
    !aiResponse &&
    !transcribedText &&
    (!messages || messages.length === 0)
  ) {
    if (merged) {
      if (!embeddedOpen) {
        return (
          <div className={`mt-4 w-full ${compact ? "" : "max-w-4xl mx-auto"}`}>
            <div className="w-full bg-surface-elevated rounded-xl p-3 flex items-center justify-between border border-border/20">
              <div className="text-sm text-muted-foreground">
                AI Conversation
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setEmbeddedOpen(true)}
                  aria-expanded={embeddedOpen}
                >
                  Expand
                </button>
              </div>
            </div>
          </div>
        );
      }
      // when embeddedOpen is true we fall through to render the merged panel
    } else {
      return (
        <div className={`mt-4 w-full ${compact ? "" : "max-w-4xl mx-auto"}`}>
          <div className="w-full bg-surface-elevated rounded-xl p-3 flex items-center justify-between border border-border/20">
            <div className="text-sm text-muted-foreground">AI Conversation</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-sm px-3 py-1 rounded-md border border-border/10 bg-transparent text-foreground/90 hover:bg-white/2"
                onClick={() => setOpenConversation(true)}
                aria-expanded={openConversation}
              >
                Open
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <section
      ref={panelRef}
      className={`w-full ${compact ? "" : "max-w-4xl mx-auto"} ${merged ? "h-full flex flex-col" : "mt-4"}`}
      aria-label="AI conversation panel"
      aria-labelledby={headerId}
    >
      <div
        className={`chat-panel w-full ${compact ? "p-3" : "p-6"} shadow-sm ${merged ? "flex-1 flex flex-col min-h-0" : ""}`}
      >
        {/* If merged, render compact status tiles and permission/ai areas at the top */}
        {merged && (
          <div className="mb-3 shrink-0">
            {/* Header: compact, with left gradient accent and compact icon controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* gradient accent */}
                <span
                  className="w-1 h-8 rounded-full bg-gradient-brand inline-block"
                  aria-hidden="true"
                />
                <div>
                  <h3 id={headerId} className="text-sm font-semibold">
                    AI Conversation
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Live transcript & assistant reply
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Mode toggle: chat (planning) vs agent (execution) */}
                <fieldset className="hidden sm:flex items-center rounded-lg border border-border/20 bg-surface/30 p-1">
                  <legend className="sr-only">Conversation mode</legend>
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      voiceMode === "chat"
                        ? "bg-white/8 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleModeChange("chat")}
                    aria-pressed={voiceMode === "chat"}
                    title="Planning mode (no tools)"
                  >
                    Plan
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      voiceMode === "agent"
                        ? "bg-white/8 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleModeChange("agent")}
                    aria-pressed={voiceMode === "agent"}
                    title={
                      capabilities.canExecuteAgents
                        ? "Execution mode (uses tools)"
                        : "Sign in to use execution mode"
                    }
                  >
                    Execute
                  </button>
                </fieldset>
                {/* Clear */}
                <button
                  type="button"
                  className="btn btn-icon-primary btn-icon-lg"
                  onClick={() => {
                    clearAiResponse();
                    clearTranscribedText();
                    clearMessages();
                    setOpenConversation(false);
                  }}
                  aria-label="Clear conversation"
                  title="Clear"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M3 6h18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {/* Simulate (dev) */}
                {typeof window !== "undefined" &&
                  (process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true" ||
                    process.env.NODE_ENV !== "production") && (
                    <button
                      type="button"
                      className="btn btn-icon-primary btn-icon-lg"
                      onClick={() => {
                        if (!simulateIncoming) return;
                        window.__nargis_simulate?.();
                      }}
                      aria-label="Simulate conversation"
                      title="Simulate"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          d="M12 5v14M5 12h14"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                {/* Collapse / Expand */}
                <button
                  type="button"
                  className="btn btn-icon-primary btn-icon-lg"
                  onClick={() => setEmbeddedOpen((s) => !s)}
                  aria-expanded={embeddedOpen}
                  aria-controls="chat-merged-body"
                  aria-label={
                    embeddedOpen
                      ? "Collapse conversation"
                      : "Expand conversation"
                  }
                  title={embeddedOpen ? "Collapse" : "Expand"}
                >
                  {embeddedOpen ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M6 15l6-6 6 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {shouldShowSignInNudge && (
              <div className="mb-3 rounded-xl border border-border/20 bg-surface-elevated/70 p-3 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  You’re in guest mode — sign in to save history.
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const next = pathname || "/";
                    router.push(`/login?next=${encodeURIComponent(next)}`);
                  }}
                >
                  Sign in
                </button>
              </div>
            )}

            <div
              id="chat-merged-body"
              className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 collapse-transition ${embeddedOpen ? "expanded" : "collapsed"}`}
            >
              <div className="status-tile text-center">
                <div className="text-xs text-muted-foreground mb-1 font-medium">
                  Speech Recognition
                </div>
                <div
                  className={`text-sm font-semibold ${isListening ? "text-success" : "text-muted-foreground"}`}
                >
                  {isListening ? "Active" : "Ready"}
                </div>
              </div>
              <div className="status-tile text-center">
                <div className="text-xs text-muted-foreground mb-1 font-medium">
                  Transcription
                </div>
                <div
                  className={`text-sm font-semibold ${transcribedText && !aiResponse ? "text-warning" : "text-muted-foreground"}`}
                >
                  {transcribedText && !aiResponse ? "Processing" : "Standby"}
                </div>
              </div>
              <div className="status-tile text-center">
                <div className="text-xs text-muted-foreground mb-1 font-medium">
                  AI Status
                </div>
                <div className="text-sm font-semibold text-success">Ready</div>
              </div>
            </div>

            <div className="chat-divider" aria-hidden="true" />

            {/* Live transcript */}
            {transcribedText && !aiResponse && (
              <div
                className="mt-1 p-3 bg-surface-elevated rounded-md border border-border/20 text-sm text-foreground whitespace-pre-wrap"
                aria-live="polite"
              >
                <strong className="sr-only">Live transcript:</strong>
                {sanitizeText(transcribedText, 2000)}
              </div>
            )}

            {/* Permission notice (renders inside the merged panel) */}
            {permissionDenied && (
              <div className="mt-3 p-3 glass bg-destructive/6 border border-destructive/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-destructive text-sm">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-destructive">
                      Microphone Access Required
                    </h3>
                    <p className="text-xs text-destructive/80 mt-1">
                      Please enable microphone permissions to use voice
                      features.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat body and controls (shared behavior with previous layout) */}
        <div
          className={`chat-body space-y-3 mb-3 ${merged ? "flex-1 min-h-0" : ""}`}
        >
          {messages && messages.length > 0 ? (
            <div
              className={`messages-scroll space-y-3 ${merged ? "flex-1 min-h-0" : "max-h-72 sm:max-h-64"}`}
            >
              {messages.map((m, i) => (
                <div
                  key={`${m.ts}-${m.role}-${i}`}
                  className={
                    m.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div className="max-w-[80%]">
                    {/* Use centralized Message component for markup */}
                    <Message
                      role={m.role}
                      text={m.text}
                      ts={m.ts}
                      thoughts={m.thoughts}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {safeTranscript && (
                <div className="mb-2">
                  <div className="text-xs font-medium mb-1">You said</div>
                  <div className="max-h-28 overflow-y-auto text-sm leading-relaxed">
                    {displayTranscript}
                    {safeTranscript.length > DISPLAY_LIMIT && (
                      <div className="mt-2">
                        <button
                          type="button"
                          className="text-xs text-primary underline"
                          onClick={() => setShowFullTranscript((s) => !s)}
                        >
                          {showFullTranscript ? "Show less" : "Show more"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium mb-1">
                  {processing ? "Nargis is thinking" : "Nargis"}
                </div>
                {processing ? (
                  <div className="flex items-center space-x-2">
                    <svg
                      role="img"
                      aria-label="Loading"
                      className="w-5 h-5 animate-spin text-muted"
                      viewBox="0 0 24 24"
                      focusable="false"
                    >
                      <title>Loading</title>
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    <span className="text-xs text-muted font-mono animate-pulse">
                      {currentAgentState || "Thinking..."}
                    </span>
                    <button
                      type="button"
                      className="ml-2 px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80"
                      onClick={() => {
                        try {
                          // Request barge-in cancellation via context method
                          stopListening();
                        } catch {
                          /* noop */
                        }
                      }}
                      aria-label="Stop processing"
                    >
                      Stop
                    </button>
                  </div>
                ) : !aiResponse ? (
                  // Fallback if no response yet and not processing (e.g. just transcript)
                  <div className="text-xs text-muted-foreground italic">
                    Waiting for response...
                  </div>
                ) : (
                  <div>
                    <div
                      className="max-h-44 overflow-y-auto text-sm leading-relaxed"
                      aria-live="polite"
                    >
                      {displayAi}
                      {safeAi.length > DISPLAY_LIMIT && (
                        <div className="mt-2">
                          <button
                            type="button"
                            className="text-xs text-primary underline"
                            onClick={() => setShowFullAi((s) => !s)}
                          >
                            {showFullAi ? "Show less" : "Show more"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              const content = sanitizeText(aiResponse ?? transcribedText ?? "");
              try {
                await navigator.clipboard?.writeText(content);
                push({ message: "Copied to clipboard", variant: "success" });
              } catch {
                push({ message: "Copy failed", variant: "error" });
              }
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const content = sanitizeText(aiResponse ?? transcribedText ?? "");
              if (!content) return;
              try {
                await addTask({
                  title: content.slice(0, 120),
                  description: content,
                  priority: "medium",
                });
              } catch {
                /* swallow */
              }
              clearAiResponse();
              clearTranscribedText();
            }}
          >
            Create Task
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              try {
                const payload = JSON.stringify(messages || [], null, 2);
                const blob = new Blob([payload], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `nargis-conversation-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                push({ message: "Download started", variant: "success" });
              } catch {
                push({ message: "Download failed", variant: "error" });
              }
            }}
          >
            Download
          </button>
        </div>
      </div>
    </section>
  );
}
