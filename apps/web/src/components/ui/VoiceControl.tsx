"use client";

import { useEffect, useMemo } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";

type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "streaming"
  | "completed";

type VoiceControlProps = {
  inline?: boolean;
  showMeta?: boolean;
};

export function VoiceControl({
  inline = false,
  showMeta = true,
}: VoiceControlProps) {
  const {
    isListening,
    processing,
    aiResponse,
    connectionStatus,
    startListening,
    stopListening,
  } = useRealtime();

  const voiceState = useMemo<VoiceState>(() => {
    if (isListening) return "listening";
    if (processing && aiResponse) return "streaming";
    if (processing) return "processing";
    if (aiResponse) return "completed";
    return "idle";
  }, [isListening, processing, aiResponse]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.voiceState = voiceState;
    return () => {
      if (root.dataset.voiceState === voiceState) {
        root.dataset.voiceState = "idle";
      }
    };
  }, [voiceState]);

  const isBusy = connectionStatus === "connecting" || processing;
  const handleClick = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  };

  return (
    <div
      className={inline ? "voice-control-inline" : "voice-control-shell"}
      aria-live="polite"
      aria-atomic="true"
    >
      <button
        type="button"
        className="voice-control"
        onClick={handleClick}
        aria-pressed={isListening}
        aria-label={isListening ? "Stop listening" : "Start listening"}
        title={isListening ? "Stop listening" : "Start listening"}
      >
        <span className="sr-only">Voice control</span>
        {voiceState === "processing" || voiceState === "streaming" ? (
          <svg
            className="voice-control-icon animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" className="opacity-30" />
            <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
          </svg>
        ) : isListening ? (
          <svg
            className="voice-control-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
          </svg>
        ) : (
          <svg
            className="voice-control-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1v11m0 0a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z"
            />
          </svg>
        )}
      </button>
      {showMeta && (
        <span className="voice-control-meta" aria-hidden="true">
          {isListening
            ? "Listening…"
            : isBusy
              ? "Processing…"
              : voiceState === "completed"
                ? "Completed"
                : "Voice"}
        </span>
      )}
    </div>
  );
}
