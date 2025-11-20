"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useTaskStore } from "@/contexts/TaskContext";
import { useToasts } from "@/contexts/ToastContext";
import { sanitizeText } from "@/lib/sanitize";

export default function AIResponseModal() {
  const {
    aiResponse,
    transcribedText,
    clearAiResponse,
    clearTranscribedText,
    messages,
    openConversation,
  } = useRealtime();
  const { addTask } = useTaskStore();
  const { push } = useToasts();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const safeTranscript = sanitizeText(transcribedText);
  const safeAi = sanitizeText(aiResponse);
  // UI-level display limit to avoid huge blocks showing immediately
  const DISPLAY_LIMIT = 2000;
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showFullAi, setShowFullAi] = useState(false);
  const displayTranscript = showFullTranscript
    ? safeTranscript
    : safeTranscript.slice(0, DISPLAY_LIMIT);
  const displayAi = showFullAi ? safeAi : safeAi.slice(0, DISPLAY_LIMIT);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clearAiResponse();
    }
    const shouldListen = Boolean(aiResponse || transcribedText);
    if (shouldListen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiResponse, transcribedText, clearAiResponse]);

  useEffect(() => {
    if (!aiResponse && !transcribedText) return;
    const prev = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    // focus first focusable element inside dialog or the dialog itself
    const focusable = dialog?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    (focusable || dialog)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Tab" && dialog) {
        const nodes = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
          ),
        ).filter((n) => !n.hasAttribute("disabled"));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prev) prev.focus();
    };
  }, [aiResponse, transcribedText]);

  // Show the modal if we have either messages, a transcript, or an AI response.
  if (
    !openConversation &&
    !aiResponse &&
    !transcribedText &&
    (!messages || messages.length === 0)
  )
    return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Dismiss AI response"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={clearAiResponse}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-background/95 dark:bg-background/90 rounded-2xl border p-6 shadow-2xl transform transition-all duration-200"
        style={{ animation: "modalIn 220ms cubic-bezier(.2,.9,.2,1)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-inner">
              <span className="text-lg text-white" aria-hidden>
                🌸
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Conversation</h3>
              <p className="text-xs text-muted-foreground">
                Transcript and AI response — refined for clarity
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Live</div>
        </div>
        <div className="text-sm mb-4 space-y-4">
          {/* Render conversation history if available */}
          {messages && messages.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-auto">
              {messages.map((m) => {
                const time = new Date(m.ts).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={m.ts}
                    className={
                      m.role === "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[80%] bg-primary/90 text-white rounded-2xl px-4 py-2 text-sm shadow-sm"
                          : "max-w-[80%] bg-surface-elevated rounded-2xl px-4 py-2 text-sm border border-border/30"
                      }
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-xs font-medium mb-1">
                          {m.role === "user" ? "You" : "Nargis"}
                        </div>
                        <div className="text-[10px] text-muted-foreground ml-2">
                          {time}
                        </div>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback to previous single-response view
            <div>
              {safeTranscript && (
                <div className="mb-3">
                  <h4 className="font-medium">You said:</h4>
                  <div className="prose max-h-28 overflow-auto text-sm">
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

              <div className="mb-2">
                <h4 className="font-medium">Nargis is thinking:</h4>
                {!aiResponse ? (
                  <div className="flex items-center space-x-2">
                    <svg
                      role="img"
                      aria-label="Loading"
                      className="w-5 h-5 animate-spin text-muted"
                      viewBox="0 0 24 24"
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
                    <span className="text-xs text-muted">Thinking...</span>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium">Nargis says:</h4>
                    <div className="prose max-h-72 overflow-auto text-sm mb-4">
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
            </div>
          )}
        </div>
        <div className="flex items-center justify-end space-x-2">
          <button
            type="button"
            className="btn px-4 py-2 bg-primary/10 text-primary rounded-md"
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
            className="btn px-4 py-2 bg-white/6 text-muted-foreground rounded-md"
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
          <button
            type="button"
            className="btn px-4 py-2 bg-primary text-white rounded-md"
            onClick={async () => {
              // Create a task from the AI response if present, otherwise from the transcript.
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
            className="btn-outline px-4 py-2 rounded-md"
            onClick={() => {
              clearAiResponse();
              clearTranscribedText();
              // After dismissing the modal, return focus to the voice input button
              // if it's present so keyboard users can continue quickly.
              try {
                const btn = document.querySelector<HTMLButtonElement>(
                  "[data-voice-button]",
                );
                if (btn) btn.focus();
              } catch {
                /* silent */
              }
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
