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
	});
	if (!res.ok) {
		let body: unknown = null;
		try {
			body = await res.json();
		} catch {
			/* ignore */
		}
		const msg =
			typeof body === "object" &&
			body !== null &&
			"message" in body &&
			typeof (body as { message: unknown }).message === "string"
				? (body as { message: string }).message
				: res.statusText;
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
