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

export class MissingEnvironmentError extends Error {
  missing: string[];

  constructor(missing: string[]) {
    super("missing-environment");
    this.name = "MissingEnvironmentError";
    this.missing = missing;
  }
}

function requireEnvMany(names: string[]): Record<string, string> {
  const missing: string[] = [];
  const values: Record<string, string> = {};

  for (const name of names) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      missing.push(name);
      continue;
    }
    values[name] = value;
  }

  if (missing.length > 0) {
    throw new MissingEnvironmentError(missing);
  }

  return values;
}

function ensureSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path.replace(/^\//, ""), ensureSlash(baseUrl)).toString();
}

export function getSpaceUrls(): SpaceUrls {
  const values = requireEnvMany(["PY_SPACE_URL", "GO_SPACE_URL"]);
  return {
    python: values.PY_SPACE_URL,
    go: values.GO_SPACE_URL,
  };
}

export function getHfConfig(): HfConfig {
  const values = requireEnvMany(["HF_TOKEN", "HF_PY_SPACE", "HF_GO_SPACE"]);
  return {
    token: values.HF_TOKEN,
    spaces: {
      python: values.HF_PY_SPACE,
      go: values.HF_GO_SPACE,
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
