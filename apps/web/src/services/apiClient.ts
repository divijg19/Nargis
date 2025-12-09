// Lightweight typed fetch helper + error normalization.
export interface ApiErrorShape {
  status: number;
  message: string;
  details?: unknown;
}

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  details?: unknown;
  constructor(init: ApiErrorShape) {
    super(init.message);
    this.status = init.status;
    this.details = init.details;
  }
}

const baseUrl = (process.env.NEXT_PUBLIC_API_PY_URL || "").replace(/\/$/, "");

export async function fetchJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!baseUrl)
    throw new ApiError({ status: 0, message: "API base URL not configured" });
  const res = await fetch(baseUrl + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    let msg = res.statusText;
    if (typeof body === "object" && body !== null) {
      const b = body as {
        error?: { message?: string };
        message?: string;
        detail?: string | { msg?: string }[];
      };
      // Handle standard error envelope { error: { code, message } }
      if (b.error && typeof b.error === "object" && b.error.message) {
        msg = b.error.message;
      }
      // Handle legacy/FastAPI default { detail: ... } or { message: ... }
      else if (b.message) {
        msg = b.message;
      } else if (b.detail) {
        msg =
          typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail);
      }
    }
    throw new ApiError({ status: res.status, message: msg, details: body });
  }
  // Handle empty responses
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// Until backend exists, provide a mock delay helper to keep UI async paths realistic
export function mockDelay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
