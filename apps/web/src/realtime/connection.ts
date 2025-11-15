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
	private sendQueue: unknown[] = [];
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
		// Prefer arraybuffer so binary frames arrive as ArrayBuffer where possible.
		try {
			this.ws.binaryType = "arraybuffer";
		} catch {
			/* ignore */
		}
		this.ws.onopen = () => {
			this.retries = 0;
			this.setStatus("open");
			// Drain any queued messages (strings/objects), keeping binary blobs off-queue.
			while (
				this.sendQueue.length > 0 &&
				this.ws &&
				this.ws.readyState === WebSocket.OPEN
			) {
				const m = this.sendQueue.shift();
				this._sendRaw(m);
			}
		};
		this.ws.onclose = () => {
			this.setStatus("closed");
			if (!this.closedByUser) this.retry();
		};
		this.ws.onerror = () => {
			// Inform listeners; onclose will handle retries.
			this.setStatus("error");
			// keep the socket open for onclose to fire, do not force-close here.
			// console.debug could be added for dev-time inspection.
		};
		this.ws.onmessage = async (evt) => {
			const data = evt.data;
			// Text message path
			if (typeof data === "string") {
				try {
					const parsed: unknown = JSON.parse(data);
					for (const h of this.handlers) h(parsed);
				} catch {
					for (const h of this.handlers) h(data);
				}
				return;
			}

			// Blob path (some browsers deliver binary as Blob)
			if (typeof Blob !== "undefined" && data instanceof Blob) {
				try {
					const txt = await data.text();
					try {
						const parsed = JSON.parse(txt);
						for (const h of this.handlers) h(parsed);
						return;
					} catch {
						const arr = await data.arrayBuffer();
						for (const h of this.handlers) h(arr);
						return;
					}
				} catch {
					for (const h of this.handlers) h(data);
					return;
				}
			}

			// ArrayBuffer or typed view: try to decode as text and parse JSON, otherwise deliver raw buffer
			if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
				try {
					const text = new TextDecoder().decode(data as ArrayBufferLike);
					try {
						const parsed = JSON.parse(text);
						for (const h of this.handlers) h(parsed);
						return;
					} catch {
						for (const h of this.handlers) h(data);
						return;
					}
				} catch {
					for (const h of this.handlers) h(data);
					return;
				}
			}

			// Fallback: deliver whatever was received
			for (const h of this.handlers) h(data);
		};
	}

	private _sendRaw(msg: unknown) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		try {
			// Binary frames: Blob/ArrayBuffer/TypedArray
			if (typeof Blob !== "undefined" && msg instanceof Blob) {
				this.ws.send(msg as Blob);
				return;
			}
			if (msg instanceof ArrayBuffer || ArrayBuffer.isView(msg)) {
				this.ws.send(msg as ArrayBufferLike);
				return;
			}
			if (typeof msg === "string") {
				this.ws.send(msg);
				return;
			}
			// Objects -> JSON
			this.ws.send(JSON.stringify(msg));
		} catch {
			// swallow send errors to avoid crashing the UI
		}
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
		// If socket isn't open, queue textual messages (strings/JSON) but drop large binary blobs.
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			// Queue messages of any type (including binary) while the socket is
			// establishing. Keep the queue bounded to avoid unbounded memory growth.
			if (this.sendQueue.length < 64) this.sendQueue.push(msg);
			return;
		}
		// If open, send immediately using the raw sender
		this._sendRaw(msg);
	}
	close() {
		this.closedByUser = true;
		this.ws?.close();
	}
}
