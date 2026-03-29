import type {
  RestartTarget,
  SystemActionError,
  SystemActionResult,
  SystemRestartResponse,
  SystemStatusResponse,
} from "@/types/system";
import { coerceSystemStatusResponse } from "@/types/system";

export const systemStatusQueryKey = ["system-status"] as const;

async function parseJsonSafe<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function toActionFailure(
  status?: number,
  payload?: SystemActionError,
): SystemActionResult<never> {
  return {
    ok: false,
    status,
    payload,
  };
}

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const response = await fetch("/api/system/status", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("system-status-unavailable");
  }

  return coerceSystemStatusResponse(await response.json());
}

export async function warmSystem(
  target: RestartTarget = "both",
  init: RequestInit = {},
): Promise<SystemActionResult<{ waking: true; target: RestartTarget }>> {
  const response = await fetch("/api/system/warm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    body: JSON.stringify({ target }),
    ...init,
  });

  if (!response.ok) {
    const payload = await parseJsonSafe<SystemActionError>(response);
    return toActionFailure(response.status, payload);
  }

  const payload = (await response.json()) as {
    waking: true;
    target: RestartTarget;
  };
  return {
    ok: true,
    status: response.status,
    data: payload,
  };
}

export async function restartSystem(
  target: RestartTarget,
): Promise<SystemActionResult<SystemRestartResponse>> {
  const response = await fetch("/api/system/restart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target }),
  });

  const payload = await parseJsonSafe<
    SystemRestartResponse & SystemActionError
  >(response);
  if (!response.ok || !payload) {
    return toActionFailure(response.status, payload);
  }

  return {
    ok: true,
    status: response.status,
    data: payload,
  };
}
