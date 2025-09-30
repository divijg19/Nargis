// WebSocket connection abstraction with auto-retry + backoff

interface RealtimeOptions {
  url: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

type MessageHandler = (data: unknown) => void;
type StatusHandler = (
  status: "connecting" | "open" | "closed" | "error" | "retrying",
) => void;

export class RealtimeConnection {
  private ws: WebSocket | null = null;
  private retries = 0;
  private handlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private closedByUser = false;
  constructor(private opts: RealtimeOptions) {
    this.connect();
  }
  onMessage(fn: MessageHandler) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }
  onStatus(fn: StatusHandler) {
    this.statusHandlers.add(fn);
    return () => this.statusHandlers.delete(fn);
  }
  private setStatus(s: Parameters<StatusHandler>[0]) {
    for (const h of this.statusHandlers) h(s);
  }
  private connect() {
    this.setStatus("connecting");
    this.ws = new WebSocket(this.opts.url);
    this.ws.onopen = () => {
      this.retries = 0;
      this.setStatus("open");
    };
    this.ws.onclose = () => {
      this.setStatus("closed");
      if (!this.closedByUser) this.retry();
    };
    this.ws.onerror = () => {
      this.setStatus("error");
    };
    this.ws.onmessage = (evt) => {
      try {
        const parsed: unknown = JSON.parse(evt.data);
        this.handlers.forEach((h) => {
          h(parsed);
        });
      } catch {
        /* ignore non-JSON */
      }
    };
  }
  private retry() {
    const { maxRetries = 5, baseDelayMs = 500 } = this.opts;
    if (this.retries >= maxRetries) return;
    this.retries += 1;
    this.setStatus("retrying");
    const delay = baseDelayMs * 2 ** (this.retries - 1);
    setTimeout(() => this.connect(), delay);
  }
  send(msg: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
  close() {
    this.closedByUser = true;
    this.ws?.close();
  }
}
