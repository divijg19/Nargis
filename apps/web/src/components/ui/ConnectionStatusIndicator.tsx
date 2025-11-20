"use client";

import { useRealtime } from "@/contexts/RealtimeContext";

export function ConnectionStatusIndicator() {
  const { connectionStatus } = useRealtime();

  const map = {
    open: { color: "bg-success", title: "Connected" },
    connecting: { color: "bg-warning", title: "Connecting..." },
    retrying: { color: "bg-warning", title: "Reconnecting..." },
    closed: { color: "bg-destructive", title: "Disconnected" },
    error: { color: "bg-destructive", title: "Connection Error" },
    idle: { color: "bg-muted", title: "Idle" },
  } as const;

  const entry =
    (map as Record<string, { color: string; title: string }>)[
      connectionStatus
    ] ?? map.idle;

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <span
          title={entry.title}
          className={`inline-block w-2.5 h-2.5 rounded-full ${entry.color}`}
          aria-hidden
        />
      </div>
      <span
        className="text-muted-foreground font-medium text-xs"
        title={entry.title}
      >
        {entry.title}
      </span>
    </div>
  );
}
