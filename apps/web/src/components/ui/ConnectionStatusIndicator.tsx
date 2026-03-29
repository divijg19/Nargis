"use client";

import { useAutoWarmSystem, useSystemStatus } from "@/hooks/useSystemStatus";
import { isEngineOnline, isWakingStatus } from "@/types/system";

export function ConnectionStatusIndicator() {
  const { data, isPending, isError } = useSystemStatus({
    refetchInterval: 30_000,
  });
  const warmMutation = useAutoWarmSystem(data);

  const go = data?.go;
  const py = data?.py;

  const isWaking =
    isWakingStatus(go?.hf_status) || isWakingStatus(py?.hf_status);
  const allOnline = Boolean(
    go && py && isEngineOnline(go) && isEngineOnline(py),
  );

  const entry = isPending
    ? { color: "bg-warning", title: "Checking AI Engines...", pulse: true }
    : isError
      ? { color: "bg-destructive", title: "Systems Unreachable", pulse: false }
      : isWaking || warmMutation.isPending
        ? {
            color: "bg-amber-500",
            title: "Waking AI Engines...",
            pulse: true,
          }
        : allOnline
          ? { color: "bg-success", title: "Systems Online", pulse: false }
          : {
              color: "bg-destructive",
              title: "Systems Degraded",
              pulse: false,
            };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <span
          title={entry.title}
          className={`inline-block h-2.5 w-2.5 rounded-full ${entry.color} ${entry.pulse ? "animate-pulse" : ""}`}
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
