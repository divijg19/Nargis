const ACTIVE_THRESHOLD_MS = 2000;
const DEFAULT_TIMEOUT_MS = 4500;

type ServiceName = "python" | "go";
export type ServiceStatus = "active" | "idle" | "unreachable";

export type ServiceHealth = {
  status: ServiceStatus;
  latency: number;
};

type PingResult = {
  ok: boolean;
  latency: number;
};

type SpaceUrls = {
  python: string;
  go: string;
};

type HfConfig = {
  token: string;
  spaces: Record<ServiceName, string>;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error("missing-environment");
  }
  return value;
}

function ensureSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path.replace(/^\//, ""), ensureSlash(baseUrl)).toString();
}

export function getSpaceUrls(): SpaceUrls {
  return {
    python: requireEnv("PY_SPACE_URL"),
    go: requireEnv("GO_SPACE_URL"),
  };
}

export function getHfConfig(): HfConfig {
  return {
    token: requireEnv("HF_TOKEN"),
    spaces: {
      python: requireEnv("HF_PY_SPACE"),
      go: requireEnv("HF_GO_SPACE"),
    },
  };
}

export async function ping(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<PingResult> {
  const startedAt = Date.now();
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: abortController.signal,
    });

    return {
      ok: response.ok,
      latency: Date.now() - startedAt,
    };
  } catch {
    return {
      ok: false,
      latency: timeoutMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function warmSpace(baseUrl: string): Promise<void> {
  const rootUrl = joinUrl(baseUrl, "/");
  const firstAttempt = await ping(rootUrl);

  if (!firstAttempt.ok || firstAttempt.latency >= ACTIVE_THRESHOLD_MS) {
    await ping(rootUrl, 6500);
  }
}

export async function getServiceHealth(
  baseUrl: string,
): Promise<ServiceHealth> {
  const result = await ping(joinUrl(baseUrl, "/health"));

  if (!result.ok) {
    return {
      status: "unreachable",
      latency: -1,
    };
  }

  return {
    status: result.latency < ACTIVE_THRESHOLD_MS ? "active" : "idle",
    latency: result.latency,
  };
}

export async function restartSpace(service: ServiceName): Promise<boolean> {
  const config = getHfConfig();
  const space = config.spaces[service];

  const response = await fetch(
    `https://api.huggingface.co/spaces/${space}/restart`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      cache: "no-store",
    },
  );

  return response.ok;
}
