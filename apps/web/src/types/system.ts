export type EngineKey = "go" | "py";
export type RestartTarget = EngineKey | "both";

export type HfStatus =
  | "RUNNING"
  | "BUILDING"
  | "SLEEPING"
  | "PAUSED"
  | "ERROR"
  | "UNKNOWN"
  | string;

export type EngineStatus = {
  hf_status: HfStatus;
  ready: boolean;
  ready_http_status?: number;
  ready_error?: string;
  app_url?: string;
};

export type SystemStatusResponse = {
  go: EngineStatus;
  py: EngineStatus;
  checked_at: string;
};

export type RestartTargetResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

export type SystemRestartResponse = {
  target: RestartTarget;
  go?: RestartTargetResult;
  py?: RestartTargetResult;
};

export type SystemActionError = {
  error?: string;
  missing?: string[];
};

export type SystemActionResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; status?: number; payload?: SystemActionError };

export const UNKNOWN_ENGINE_STATUS: EngineStatus = {
  hf_status: "UNKNOWN",
  ready: false,
};

export function isWakingStatus(state: string | null | undefined): boolean {
  return state === "SLEEPING" || state === "PAUSED" || state === "BUILDING";
}

export function hasSleepingEngine(status: EngineStatus): boolean {
  return status.hf_status === "SLEEPING" || status.hf_status === "PAUSED";
}

export function isEngineOnline(status: EngineStatus): boolean {
  return status.hf_status === "RUNNING" && Boolean(status.ready);
}

export function getEngineStatusMeta(status: EngineStatus): {
  label: string;
  dotClassName: string;
  textClassName: string;
} {
  if (isEngineOnline(status)) {
    return {
      label: "Online",
      dotClassName: "bg-success",
      textClassName: "text-foreground",
    };
  }
  if (isWakingStatus(status.hf_status)) {
    return {
      label: "Waking",
      dotClassName: "bg-amber-500",
      textClassName: "text-muted-foreground",
    };
  }
  if (status.hf_status === "RUNNING" && !status.ready) {
    return {
      label: "Booting",
      dotClassName: "bg-warning",
      textClassName: "text-muted-foreground",
    };
  }
  return {
    label: "Unavailable",
    dotClassName: "bg-destructive",
    textClassName: "text-destructive",
  };
}

export function coerceEngineStatus(input: unknown): EngineStatus {
  if (
    typeof input === "object" &&
    input !== null &&
    "ready" in input &&
    (typeof (input as { hf_status?: unknown }).hf_status === "string" ||
      typeof (input as { hf_state?: unknown }).hf_state === "string") &&
    typeof (input as { ready?: unknown }).ready === "boolean"
  ) {
    return {
      hf_status: String(
        (input as { hf_status?: string; hf_state?: string }).hf_status ||
          (input as { hf_state?: string }).hf_state ||
          "UNKNOWN",
      ),
      ready: (input as { ready: boolean }).ready,
      ready_http_status: (input as { ready_http_status?: number })
        .ready_http_status,
      ready_error: (input as { ready_error?: string }).ready_error,
      app_url: (input as { app_url?: string }).app_url,
    };
  }

  return UNKNOWN_ENGINE_STATUS;
}

export function coerceSystemStatusResponse(
  input: unknown,
): SystemStatusResponse {
  if (typeof input !== "object" || input === null) {
    return {
      go: UNKNOWN_ENGINE_STATUS,
      py: UNKNOWN_ENGINE_STATUS,
      checked_at: new Date().toISOString(),
    };
  }

  const payload = input as {
    go?: unknown;
    py?: unknown;
    checked_at?: unknown;
  };

  return {
    go: coerceEngineStatus(payload.go),
    py: coerceEngineStatus(payload.py),
    checked_at:
      typeof payload.checked_at === "string"
        ? payload.checked_at
        : new Date().toISOString(),
  };
}
