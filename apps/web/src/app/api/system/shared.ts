import {
  type EngineKey,
  type HfStatus,
  type RestartTarget,
  type RestartTargetResult,
  type SystemRestartResponse,
  type SystemStatusResponse,
  UNKNOWN_ENGINE_STATUS,
} from "@/types/system";

const READY_TIMEOUT_MS = 3000;
const WARM_TIMEOUT_MS = 1000;

type HfSpaceApiPayload = {
  runtime?: { stage?: string | null } | null;
  stage?: string | null;
};

export class MissingEnvironmentError extends Error {
  missing: string[];

  constructor(missing: string[]) {
    super("missing-environment");
    this.name = "MissingEnvironmentError";
    this.missing = missing;
  }
}

export function getMissingEnvironment(error: unknown): string[] | null {
  if (error instanceof MissingEnvironmentError) {
    return error.missing;
  }
  return null;
}

function getFirstEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (value?.trim()) {
      return value.trim();
    }
  }
  return null;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(
    path.replace(/^\//, ""),
    ensureTrailingSlash(baseUrl),
  ).toString();
}

function slugToSpaceUrl(spaceId: string): string {
  return `https://${spaceId.replace("/", "-")}.hf.space`;
}

function normalizeHfStatus(value: string | null | undefined): HfStatus {
  const upper = String(value || "UNKNOWN")
    .trim()
    .toUpperCase();

  if (!upper) return "UNKNOWN";
  if (upper === "PAUSED") return "SLEEPING";
  return upper;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function getSpaceIds(): Record<EngineKey, string> {
  const go = getFirstEnv("HF_SPACE_GO", "HF_GO_SPACE");
  const py = getFirstEnv("HF_SPACE_PY", "HF_PY_SPACE");

  const missing: string[] = [];
  if (!go) missing.push("HF_SPACE_GO");
  if (!py) missing.push("HF_SPACE_PY");

  if (missing.length > 0) {
    throw new MissingEnvironmentError(missing);
  }

  return { go: go as string, py: py as string };
}

export function getBackendBaseUrls(): Record<EngineKey, string> {
  const spaces = getSpaceIds();

  const go =
    getFirstEnv("NEXT_PUBLIC_GO_URL", "GO_SPACE_URL") ||
    slugToSpaceUrl(spaces.go);
  const py =
    getFirstEnv(
      "NEXT_PUBLIC_PY_URL",
      "NEXT_PUBLIC_API_PY_URL",
      "PY_SPACE_URL",
    ) || slugToSpaceUrl(spaces.py);

  return {
    go,
    py,
  };
}

function getHfToken(): string {
  const token = getFirstEnv("HF_TOKEN");
  if (!token) {
    throw new MissingEnvironmentError(["HF_TOKEN"]);
  }
  return token;
}

export async function fetchHfStatus(spaceId: string): Promise<HfStatus> {
  try {
    const response = await fetchWithTimeout(
      `https://huggingface.co/api/spaces/${spaceId}`,
      {
        method: "GET",
        cache: "no-store",
      },
      READY_TIMEOUT_MS,
    );

    if (!response.ok) {
      return "ERROR";
    }

    const payload = (await response.json()) as HfSpaceApiPayload;
    return normalizeHfStatus(
      payload.runtime?.stage || payload.stage || "UNKNOWN",
    );
  } catch {
    return "ERROR";
  }
}

export async function probeReady(
  baseUrl: string,
): Promise<{ ready: boolean; status: number; error?: string }> {
  try {
    const response = await fetchWithTimeout(
      joinUrl(baseUrl, "/ready"),
      {
        method: "GET",
        cache: "no-store",
      },
      READY_TIMEOUT_MS,
    );

    return {
      ready: response.ok,
      status: response.status,
    };
  } catch {
    return {
      ready: false,
      status: 0,
      error: "timeout-or-network",
    };
  }
}

export async function buildSystemStatusResponse(): Promise<SystemStatusResponse> {
  const [spaces, baseUrls] = [getSpaceIds(), getBackendBaseUrls()];

  const [goHfStatus, pyHfStatus, goReady, pyReady] = await Promise.all([
    fetchHfStatus(spaces.go),
    fetchHfStatus(spaces.py),
    probeReady(baseUrls.go),
    probeReady(baseUrls.py),
  ]);

  return {
    go: {
      hf_status: goHfStatus,
      ready: goReady.ready,
      ready_http_status: goReady.status,
      ready_error: goReady.error,
      app_url: baseUrls.go,
    },
    py: {
      hf_status: pyHfStatus,
      ready: pyReady.ready,
      ready_http_status: pyReady.status,
      ready_error: pyReady.error,
      app_url: baseUrls.py,
    },
    checked_at: new Date().toISOString(),
  };
}

export function buildSystemStatusFallback(
  missing?: string[] | null,
): SystemStatusResponse {
  const readyError =
    missing && missing.length > 0
      ? `missing-env:${missing.join(",")}`
      : undefined;

  return {
    go: readyError
      ? {
          ...UNKNOWN_ENGINE_STATUS,
          ready_error: readyError,
        }
      : UNKNOWN_ENGINE_STATUS,
    py: readyError
      ? {
          ...UNKNOWN_ENGINE_STATUS,
          ready_error: readyError,
        }
      : UNKNOWN_ENGINE_STATUS,
    checked_at: new Date().toISOString(),
  };
}

function warmUrlNonBlocking(baseUrl: string): void {
  void fetchWithTimeout(
    joinUrl(baseUrl, "/health"),
    {
      method: "GET",
      cache: "no-store",
    },
    WARM_TIMEOUT_MS,
  ).catch(() => {
    // Intentionally ignored; warm should never block the UI.
  });
}

export function triggerWarmup(target: RestartTarget = "both"): void {
  const urls = getBackendBaseUrls();

  if (target === "go" || target === "both") {
    warmUrlNonBlocking(urls.go);
  }
  if (target === "py" || target === "both") {
    warmUrlNonBlocking(urls.py);
  }
}

async function restartTarget(target: EngineKey): Promise<RestartTargetResult> {
  const token = getHfToken();
  const spaces = getSpaceIds();
  const space = spaces[target];

  try {
    const response = await fetchWithTimeout(
      `https://huggingface.co/api/spaces/${space}/restart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
      READY_TIMEOUT_MS,
    );

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "restart-failed",
      };
    }

    return { ok: true, status: response.status };
  } catch {
    return {
      ok: false,
      error: "restart-failed",
    };
  }
}

export async function restartByTarget(
  target: RestartTarget,
): Promise<SystemRestartResponse> {
  const result: SystemRestartResponse = { target };

  const tasks: Promise<void>[] = [];

  if (target === "go" || target === "both") {
    tasks.push(
      restartTarget("go").then((go) => {
        result.go = go;
      }),
    );
  }

  if (target === "py" || target === "both") {
    tasks.push(
      restartTarget("py").then((py) => {
        result.py = py;
      }),
    );
  }

  await Promise.all(tasks);

  return result;
}
