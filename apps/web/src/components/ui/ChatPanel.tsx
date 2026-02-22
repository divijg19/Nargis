"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useTaskStore } from "@/contexts/TaskContext";
import { useToasts } from "@/contexts/ToastContext";
import { sanitizeText } from "@/lib/sanitize";
import { ConversationActions } from "./chat-panel/ConversationActions";
import { ConversationCollapsedTrigger } from "./chat-panel/ConversationCollapsedTrigger";
import { ConversationContent } from "./chat-panel/ConversationContent";
import { ConversationMergedHeader } from "./chat-panel/ConversationMergedHeader";
import { ConversationMergedMeta } from "./chat-panel/ConversationMergedMeta";

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
  const [openConversation, setOpenConversation] = useState(false);
  const [embeddedOpen, setEmbeddedOpen] = useState(true);
  const [showFullAi, setShowFullAi] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [voiceStateAnnouncement, setVoiceStateAnnouncement] = useState("");
  const [conversationAnnouncement, setConversationAnnouncement] = useState("");
  const lastVoiceStateRef = useRef<"idle" | "listening" | "processing">("idle");
  const lastTranscriptRef = useRef<string>("");
  const lastAssistantKeyRef = useRef<string>("");

  const rawAi = sanitizeText(aiResponse);
  const safeAi = /[{[\]"]|\bchoices\b|\bmessage\b|\bcontent\b/i.test(rawAi)
    ? sanitizeText(rawAi, 20000, true)
    : rawAi;
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

  const showSimulate =
    typeof window !== "undefined" &&
    (process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true" ||
      process.env.NODE_ENV !== "production");

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

  const handleClearConversation = () => {
    clearAiResponse();
    clearTranscribedText();
    clearMessages();
    setOpenConversation(false);
  };

  const handleSignIn = () => {
    const next = pathname || "/";
    router.push(`/login?next=${encodeURIComponent(next)}`);
  };

  const handleCopy = async () => {
    const content = sanitizeText(aiResponse ?? transcribedText ?? "");
    try {
      await navigator.clipboard?.writeText(content);
      push({ message: "Copied to clipboard", variant: "success" });
    } catch {
      push({ message: "Copy failed", variant: "error" });
    }
  };

  const handleCreateTask = async () => {
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
  };

  const handleDownload = () => {
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
  };

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

    // Initially scroll to bottom when opening the conversation
    scrollToBottom();

    const obs = new MutationObserver(() => {
      // Only auto-scroll when the user is near the bottom to avoid
      // yanking them while they're reading earlier messages.
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <=
        40;
      if (isNearBottom) {
        // small timeout to allow rendering to finish
        setTimeout(scrollToBottom, 30);
      }
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

  useEffect(() => {
    if (
      (transcribedText || aiResponse || (messages?.length ?? 0) > 0) &&
      !openConversation
    ) {
      setOpenConversation(true);
    }
  }, [transcribedText, aiResponse, messages, openConversation]);

  useEffect(() => {
    const nextState: "idle" | "listening" | "processing" = isListening
      ? "listening"
      : processing
        ? "processing"
        : "idle";

    if (lastVoiceStateRef.current !== nextState) {
      lastVoiceStateRef.current = nextState;
      if (nextState === "listening") {
        setVoiceStateAnnouncement("Listening");
      } else if (nextState === "processing") {
        setVoiceStateAnnouncement("Processing request");
      } else {
        setVoiceStateAnnouncement("");
      }
    }
  }, [isListening, processing]);

  useEffect(() => {
    const transcript = (transcribedText || "").trim();
    if (transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      setConversationAnnouncement("Transcript received");
    }
  }, [transcribedText]);

  useEffect(() => {
    const assistantMessages = (messages || []).filter(
      (m) => m.role === "assistant",
    );
    const last = assistantMessages[assistantMessages.length - 1];
    if (!last) return;
    const nextKey = `${last.ts}:${last.text}`;
    if (nextKey === lastAssistantKeyRef.current) return;
    lastAssistantKeyRef.current = nextKey;
    setConversationAnnouncement(
      `Assistant response: ${sanitizeText(last.text).slice(0, 160)}`,
    );
  }, [messages]);

  // If nothing to show and panel closed, render a compact trigger bar.
  // For merged/embedded usage we show a slimmer trigger that expands the
  // embedded panel instead of opening the full conversation drawer.
  if (
    !openConversation &&
    !aiResponse &&
    !transcribedText &&
    (!messages || messages.length === 0)
  ) {
    if ((merged && !embeddedOpen) || !merged) {
      return (
        <ConversationCollapsedTrigger
          compact={compact}
          merged={merged}
          openConversation={openConversation}
          embeddedOpen={embeddedOpen}
          onOpenConversation={() => setOpenConversation(true)}
          onExpandEmbedded={() => setEmbeddedOpen(true)}
        />
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
        className={`chat-panel w-full ${compact ? "p-3" : "p-6"} ${merged ? "flex-1 flex flex-col min-h-0" : ""}`}
      >
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {voiceStateAnnouncement}
        </div>
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {conversationAnnouncement}
        </div>

        {/* If merged, render compact status tiles and permission/ai areas at the top */}
        {merged && (
          <div className="mb-3 shrink-0">
            <ConversationMergedHeader
              headerId={headerId}
              voiceMode={voiceMode}
              canExecuteAgents={capabilities.canExecuteAgents}
              embeddedOpen={embeddedOpen}
              onModeChange={handleModeChange}
              onClear={handleClearConversation}
              onToggleEmbedded={() => setEmbeddedOpen((s) => !s)}
              onSimulate={() => window.__nargis_simulate?.()}
              showSimulate={showSimulate && Boolean(simulateIncoming)}
            />

            <ConversationMergedMeta
              shouldShowSignInNudge={shouldShowSignInNudge}
              embeddedOpen={embeddedOpen}
              isListening={isListening}
              transcribedText={transcribedText}
              aiResponse={aiResponse}
              permissionDenied={permissionDenied}
              onSignIn={handleSignIn}
            />
          </div>
        )}

        <ConversationContent
          merged={merged}
          messages={messages || []}
          safeTranscript={safeTranscript}
          safeAi={safeAi}
          displayTranscript={displayTranscript}
          displayAi={displayAi}
          displayLimit={DISPLAY_LIMIT}
          processing={processing}
          currentAgentState={currentAgentState}
          showFullTranscript={showFullTranscript}
          showFullAi={showFullAi}
          onToggleShowFullTranscript={() => setShowFullTranscript((s) => !s)}
          onToggleShowFullAi={() => setShowFullAi((s) => !s)}
          onStopProcessing={() => {
            try {
              stopListening();
            } catch {
              /* noop */
            }
          }}
        />

        <ConversationActions
          messages={messages || []}
          aiResponse={aiResponse}
          transcribedText={transcribedText}
          onCopy={handleCopy}
          onCreateTask={handleCreateTask}
          onDownload={handleDownload}
        />
      </div>
    </section>
  );
}
