import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function waitForOk(
  request: APIRequestContext,
  url: string,
  timeoutMs = 30_000,
) {
  const start = Date.now();
  // Simple retry loop; avoids adding extra deps.
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await request.get(url);
      if (resp.ok()) return;
    } catch {
      // ignore
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

type WsEvent = { type: string; [k: string]: unknown };

async function wsRoundTrip(
  page: Page,
  opts: { mode?: "chat" | "agent"; payload: Uint8Array; timeoutMs?: number },
): Promise<WsEvent[]> {
  const { mode, payload, timeoutMs = 15_000 } = opts;

  return page.evaluate(
    async ({ mode, payloadBytes, timeoutMs }) => {
      const wsUrl = "ws://localhost:8080/ws";
      const events: WsEvent[] = [];

      function parseLine(line: string) {
        try {
          const obj = JSON.parse(line);
          if (obj && typeof obj === "object") events.push(obj as WsEvent);
        } catch {
          // ignore non-JSON
        }
      }

      return await new Promise<WsEvent[]>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";

        const timer = setTimeout(() => {
          try {
            ws.close();
          } catch {
            // ignore
          }
          reject(new Error("WS timed out"));
        }, timeoutMs);

        ws.onopen = () => {
          try {
            if (mode) ws.send(`MODE:${mode}`);
            ws.send(new Uint8Array(payloadBytes));
          } catch (e) {
            clearTimeout(timer);
            reject(e);
          }
        };

        ws.onmessage = (ev) => {
          if (typeof ev.data === "string") {
            parseLine(ev.data);
            const last = events[events.length - 1];
            if (last?.type === "end") {
              clearTimeout(timer);
              try {
                ws.close();
              } catch {
                // ignore
              }
              resolve(events);
              return;
            }
            if (last?.type === "error") {
              // In some error cases the gateway may not send an end marker.
              // Resolve to allow assertions on error content.
              clearTimeout(timer);
              try {
                ws.close();
              } catch {
                // ignore
              }
              resolve(events);
            }
          }
        };

        ws.onerror = () => {
          clearTimeout(timer);
          reject(new Error("WS error"));
        };

        ws.onclose = () => {
          // If the server closes early, still resolve with what we have.
          clearTimeout(timer);
          resolve(events);
        };
      });
    },
    { mode, payloadBytes: Array.from(payload), timeoutMs },
  );
}

async function wsStop(page: Page, timeoutMs = 5_000): Promise<WsEvent[]> {
  return page.evaluate(
    async ({ timeoutMs }) => {
      const wsUrl = "ws://localhost:8080/ws";
      const events: WsEvent[] = [];

      function parseLine(line: string) {
        try {
          const obj = JSON.parse(line);
          if (obj && typeof obj === "object") events.push(obj as WsEvent);
        } catch {
          // ignore non-JSON
        }
      }

      return await new Promise<WsEvent[]>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);

        const timer = setTimeout(() => {
          try {
            ws.close();
          } catch {
            // ignore
          }
          reject(new Error("WS STOP timed out"));
        }, timeoutMs);

        ws.onopen = () => {
          try {
            ws.send("STOP");
          } catch (e) {
            clearTimeout(timer);
            reject(e);
          }
        };

        ws.onmessage = (ev) => {
          if (typeof ev.data === "string") {
            parseLine(ev.data);
            const last = events[events.length - 1];
            if (last?.type === "end") {
              clearTimeout(timer);
              try {
                ws.close();
              } catch {
                // ignore
              }
              resolve(events);
            }
          }
        };

        ws.onerror = () => {
          clearTimeout(timer);
          reject(new Error("WS error"));
        };
      });
    },
    {
      timeoutMs,
    },
  );
}

// A tiny EBML/WebM-looking prefix so the gateway bypasses VAD.
const FAKE_WEBM = new Uint8Array([
  0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00,
]);

test.beforeAll(async ({ request }) => {
  // Web is handled by playwright webServer. Also wait for gateway/api.
  await waitForOk(request, "http://localhost:8080/ready", 60_000);
  await waitForOk(request, "http://127.0.0.1:8000/health", 60_000);
});

test("WS chat mode returns deterministic response", async ({ page }) => {
  await page.goto("http://localhost:3000/");

  const events = await wsRoundTrip(page, { mode: "chat", payload: FAKE_WEBM });
  const response = events.find((e) => e.type === "response") as
    | { type: "response"; content?: unknown }
    | undefined;

  expect(response?.content).toBeTruthy();
  expect(String(response?.content)).toContain("didn't catch");
});

test("WS agent mode rejects unauthenticated", async ({ page }) => {
  await page.goto("http://localhost:3000/");

  const events = await wsRoundTrip(page, { mode: "agent", payload: FAKE_WEBM });
  const err = events.find((e) => e.type === "error") as
    | { type: "error"; content?: unknown }
    | undefined;

  expect(String(err?.content || "")).toContain("Login required");
});

test("WS agent mode works with auth cookie", async ({ page }) => {
  // Register a user and capture the returned access token.
  const email = `e2e-${Date.now()}@example.com`;
  const password = "password12345";

  await page.goto("http://localhost:3000/");

  // Exercise real browser CORS + Set-Cookie flow (not Playwright request context).
  const registerOk = await page.evaluate(
    async ({ email, password }) => {
      const resp = await fetch("http://localhost:8080/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name: "E2E" }),
      });
      return resp.ok;
    },
    { email, password },
  );
  expect(registerOk).toBeTruthy();

  // The gateway should proxy auth to api-py and forward Set-Cookie back.
  // Since we used the page's request context, the cookie jar should now
  // include an access_token for localhost:8080.
  const cookies = await page.context().cookies("http://localhost:8080");
  expect(
    cookies.some((c) => c.name === "access_token" && c.value),
  ).toBeTruthy();

  const events = await wsRoundTrip(page, { mode: "agent", payload: FAKE_WEBM });

  const err = events.find((e) => e.type === "error") as
    | { type: "error"; content?: unknown }
    | undefined;
  expect(String(err?.content || "")).not.toContain("Login required");

  const response = events.find((e) => e.type === "response") as
    | { type: "response"; content?: unknown }
    | undefined;
  expect(String(response?.content || "")).toContain("didn't catch");
});

test("WS STOP returns canceled end", async ({ page }) => {
  await page.goto("http://localhost:3000/");

  const events = await wsStop(page);
  const end = events.find((e) => e.type === "end") as
    | { type: "end"; content?: unknown }
    | undefined;

  expect(String(end?.content || "").toLowerCase()).toContain("canceled");
});
