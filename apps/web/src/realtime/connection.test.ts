import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeConnection } from "./connection";

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState = 0;
  binaryType: BinaryType = "blob";

  sent: unknown[] = [];

  onopen: ((ev?: unknown) => void) | null = null;
  onclose: ((ev?: unknown) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void | Promise<void>) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  static instances: MockWebSocket[] = [];

  send(data: unknown) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({});
  }

  // helpers
  _open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({});
  }

  _emitMessage(data: unknown) {
    void this.onmessage?.({ data });
  }
}

describe("RealtimeConnection", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    // @ts-expect-error - override global in test
    globalThis.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues messages until open and then flushes", () => {
    const conn = new RealtimeConnection({ url: "ws://test" });
    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    if (!ws) throw new Error("expected websocket instance");

    conn.send({ hello: "world" });
    conn.send("A");

    expect(ws.sent).toHaveLength(0);

    ws._open();

    // queued messages flushed on open
    expect(ws.sent).toHaveLength(2);
    expect(ws.sent[0]).toBe(JSON.stringify({ hello: "world" }));
    expect(ws.sent[1]).toBe("A");

    conn.close();
  });

  it("parses JSON text messages", async () => {
    const conn = new RealtimeConnection({ url: "ws://test" });
    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    if (!ws) throw new Error("expected websocket instance");
    ws._open();

    const received: unknown[] = [];
    conn.onMessage((m) => received.push(m));

    ws._emitMessage('{"type":"response","content":"ok"}');

    // allow microtasks (onmessage is async)
    await Promise.resolve();

    expect(received).toEqual([{ type: "response", content: "ok" }]);
    conn.close();
  });

  it("delivers non-JSON text as string", async () => {
    const conn = new RealtimeConnection({ url: "ws://test" });
    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    if (!ws) throw new Error("expected websocket instance");
    ws._open();

    const received: unknown[] = [];
    conn.onMessage((m) => received.push(m));

    ws._emitMessage("not-json");
    await Promise.resolve();

    expect(received).toEqual(["not-json"]);
    conn.close();
  });

  it("retries with exponential backoff when closed unexpectedly", () => {
    vi.useFakeTimers();

    const statuses: string[] = [];
    const conn = new RealtimeConnection({
      url: "ws://test",
      baseDelayMs: 100,
      maxRetries: 3,
    });
    conn.onStatus((s) => statuses.push(s));

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws1 = MockWebSocket.instances[0];
    if (!ws1) throw new Error("expected websocket instance");
    ws1._open();

    // unexpected close triggers retry scheduling
    ws1.close();

    // 1st retry after 100ms
    vi.advanceTimersByTime(99);
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(2);

    const ws2 = MockWebSocket.instances[1];
    if (!ws2) throw new Error("expected websocket instance");
    ws2._open();
    conn.close();

    expect(statuses).toContain("retrying");
  });
});
