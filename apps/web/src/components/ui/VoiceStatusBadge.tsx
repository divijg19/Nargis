"use client";

import { useMemo } from "react";

type ConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error"
  | "retrying";

export function VoiceStatusBadge({
  connectionStatus,
  isListening,
  className,
}: {
  connectionStatus: ConnectionStatus;
  isListening: boolean;
  className?: string;
}) {
  const status = useMemo(() => {
    if (isListening) return { dot: "bg-success", label: "Listening" };
    switch (connectionStatus) {
      case "open":
        return { dot: "bg-success", label: "Connected" };
      case "connecting":
        return { dot: "bg-warning", label: "Connecting…" };
      case "retrying":
        return { dot: "bg-warning", label: "Reconnecting…" };
      case "closed":
      case "error":
        return { dot: "bg-destructive", label: "Disconnected" };
      default:
        return { dot: "bg-muted", label: "Idle" };
    }
  }, [connectionStatus, isListening]);

  return (
    <div
      className={
        className ?? "flex items-center gap-2 text-xs text-muted-foreground"
      }
      aria-hidden
    >
      <span
        className={`inline-flex items-center w-2 h-2 rounded-full ${status.dot}`}
      />
      <span className="font-medium">{status.label}</span>
    </div>
  );
}
