"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useToasts } from "@/contexts/ToastContext";

type VoiceSize = "sm" | "md" | "lg";

export function VoiceInputButton({ size = "md", showStatus = true }: { size?: VoiceSize; showStatus?: boolean }) {
  const { isListening, startListening, stopListening, connectionStatus } =
    useRealtime();
  const { push } = useToasts();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Announce recording state changes via toast for screen reader & visual users.
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    if (isListening) push({ message: "Recording started", variant: "info" });
    else push({ message: "Recording stopped", variant: "info" });
  }, [isListening, push]);

  // Allow clicks while the connection is still establishing; startListening
  // will attempt to connect and notify the user.
  const disabled = false;

  const handleClick = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const sizeClass =
    size === "lg"
      ? "w-28 h-28 sm:w-32 sm:h-32 text-2xl aspect-square px-0"
      : size === "sm"
        ? "w-8 h-8 text-sm aspect-square px-0"
        : "w-10 h-10 text-base aspect-square px-0";
  const iconSizeClass =
    size === "lg" ? "w-14 h-14" : size === "sm" ? "w-6 h-6" : "w-9 h-9";

  const statusMap: Record<string, { dot: string; label: string }> = {
    open: { dot: "bg-success", label: "Connected" },
    connecting: { dot: "bg-amber-400", label: "Connecting…" },
    retrying: { dot: "bg-amber-400", label: "Reconnecting…" },
    closed: { dot: "bg-destructive", label: "Disconnected" },
    error: { dot: "bg-destructive", label: "Connection Error" },
    idle: { dot: "bg-muted-foreground", label: "Idle" },
  };

  const status = statusMap[connectionStatus] ?? statusMap.idle;

  return (
    <div className={showStatus ? "flex flex-col items-center gap-3" : "flex items-center gap-2"}>
      <button
        type="button"
        ref={buttonRef}
        data-voice-button
        aria-pressed={isListening}
        disabled={disabled}
        onClick={handleClick}
        className={`inline-flex items-center justify-center ${sizeClass} rounded-full transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed shadow-2xl leading-none
          ${isListening
            ? "bg-linear-to-r from-red-500 to-pink-500 text-white scale-105 border-4 border-white/20 ring-8 ring-red-300/10 shadow-[0_10px_30px_rgba(239,68,68,0.12)]"
            : connectionStatus === "connecting"
              ? "bg-linear-to-r from-yellow-400 to-yellow-500 text-white animate-pulse border-2 border-yellow-300/40 ring-4 ring-yellow-200/8"
              : "bg-gradient-brand text-white hover:scale-105 border-2 border-primary/20 hover:border-primary/40 ring-2 ring-primary/6"
          }
        `}
        title={
          connectionStatus === "connecting"
            ? "Connecting..."
            : isListening
              ? "Stop listening"
              : "Start listening"
        }
        aria-live="polite"
      >
        <span className="sr-only">Voice Input</span>
        {isListening ? (
          <svg
            role="img"
            aria-label="Stop recording"
            className={`${iconSizeClass} animate-pulse block mx-auto leading-none`}
            style={{ transform: "translateY(2px)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <title>Stop recording</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
          </svg>
        ) : (
          <svg
            role="img"
            aria-label="Start recording"
            className={`${iconSizeClass} block mx-auto leading-none`}
            style={{ transform: "translateY(10px)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <title>Start recording</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1v11m0 0a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z"
            />
          </svg>
        )}
      </button>

      {/* Optional status badge: shown below the button for larger placements,
          or hidden when the caller prefers to render a compact status inline
          (for example, inside a navbar). */}
      {showStatus && (
        <div
          className="flex items-center gap-2 text-2xs text-muted-foreground"
          aria-hidden
        >
          <span
            className={`inline-flex items-center w-2 h-2 rounded-full ${status.dot}`}
          />
          <span className="font-medium">
            {isListening ? "Listening" : status.label}
          </span>
        </div>
      )}
    </div>
  );
}
