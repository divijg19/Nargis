// Lightweight typed fetch helper + error normalization.
import { authService } from "@/services/auth";

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

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

function normalizeApiPath(path: string): string {
  const candidate = path.trim();
  if (!candidate) return "/api/v1";
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (candidate === "/api/v1" || candidate.startsWith("/api/v1/")) {
    return candidate;
  }

  throw new Error(
    `Non-canonical API path: ${path}. Expected a /api/v1/... path.`,
  );
}

export async function fetchAPI(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const normalizedPath = normalizeApiPath(path);
  const url = /^https?:\/\//i.test(normalizedPath)
    ? normalizedPath
    : `${apiBase}${normalizedPath}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const sessionHeaders = new Headers(authService.getAuthHeaders());
  sessionHeaders.forEach((value, key) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function fetchJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetchAPI(path, options);
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
