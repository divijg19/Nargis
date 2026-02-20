"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useToasts } from "@/contexts/ToastContext";
import { VoiceStatusBadge } from "./VoiceStatusBadge";

type VoiceSize = "sm" | "md" | "lg";

export function VoiceInputButton({
  size = "md",
  showStatus = true,
  variantOverride,
  iconSizeClass: iconSizeClassProp,
  statusInline = false,
}: {
  size?: VoiceSize;
  showStatus?: boolean;
  variantOverride?: string;
  iconSizeClass?: string;
  statusInline?: boolean;
}) {
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
    if (isListening)
      push({
        message: "Recording started",
        variant: "info",
        type: "recording-started",
      });
    else
      push({
        message: "Recording stopped",
        variant: "info",
        type: "recording-stopped",
      });
  }, [isListening, push]);

  // Allow clicks while the connection is still establishing; startListening
  // will attempt to connect and notify the user.
  const disabled = false;

  const handleClick = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const defaultSizeClass =
    size === "lg"
      ? "w-28 h-28 sm:w-32 sm:h-32 text-2xl aspect-square px-0"
      : size === "sm"
        ? "w-8 h-8 text-sm aspect-square px-0"
        : "w-10 h-10 text-base aspect-square px-0";

  // If a variantOverride is provided, callers may want custom proportions
  // (e.g., a rounded square). Remove the `aspect-square` helper so width
  // and height can be independently controlled by the override classes.
  const sizeClass = variantOverride
    ? defaultSizeClass.replace(" aspect-square", "")
    : defaultSizeClass;
  const iconSizeClass =
    size === "lg" ? "w-16 h-16" : size === "sm" ? "w-5 h-5" : "w-9 h-9";

  // Allow callers to override the icon size independently of the overall button
  // size. If an explicit iconSizeClass is provided, use that instead.
  const finalIconSizeClass = iconSizeClassProp ?? iconSizeClass;

  // Detect inline/compact usage (navbar) — small size with no status shown
  const isInline = size === "sm" && showStatus === false;

  // Determine variant classes driven by global tokens in globals.css
  const variantClass = isListening
    ? "voice-btn--listening"
    : connectionStatus === "connecting"
      ? "voice-btn--connecting"
      : isInline
        ? "voice-btn--inline"
        : "voice-btn--idle";

  const roundedClass = variantOverride ? "" : "rounded-full";

  // Determine container layout: stacked (default when showStatus true),
  // inline (when caller requests statusInline), or compact (no status)
  const containerClass = statusInline
    ? "flex items-center gap-2"
    : showStatus
      ? "flex flex-col items-center gap-3"
      : "flex items-center gap-2";

  return (
    <div className={containerClass}>
      {/* When rendering inline status we show the small status first so the
			   icon sits to the right of the status (per design request). */}
      {showStatus && statusInline && (
        <VoiceStatusBadge
          connectionStatus={connectionStatus}
          isListening={isListening}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        />
      )}
      <button
        type="button"
        ref={buttonRef}
        data-voice-button
        aria-pressed={isListening}
        disabled={disabled}
        onClick={handleClick}
        className={`btn voice-btn ${sizeClass} ${roundedClass} ${variantClass} ${variantOverride ?? ""} disabled:opacity-40 disabled:cursor-not-allowed`}
        title={
          connectionStatus === "connecting"
            ? "Connecting..."
            : isListening
              ? "Stop listening"
              : "Start listening"
        }
      >
        <span className="sr-only">Voice Input</span>
        {isListening ? (
          <svg
            role="img"
            aria-label="Stop recording"
            className={`${finalIconSizeClass} animate-pulse block mx-auto leading-none`}
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
            className={`${finalIconSizeClass} block mx-auto leading-none`}
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
      {showStatus && !statusInline && (
        <VoiceStatusBadge
          connectionStatus={connectionStatus}
          isListening={isListening}
          className="flex items-center gap-2 text-2xs text-muted-foreground"
        />
      )}
    </div>
  );
}
