// Lightweight domain event dispatcher (Phase P1/P2 bridge)
// Logs events and allows simple subscription for local side-effects.

export interface DomainEvent<
	T = Record<string, unknown>,
	M extends Record<string, unknown> | undefined = Record<string, unknown>,
> {
	type: string; // e.g. task.created
	occurredAt: string; // ISO timestamp
	data: T;
	meta?: M;
}

type Listener = (
	evt: DomainEvent<
		Record<string, unknown>,
		Record<string, unknown> | undefined
	>,
) => void;

const listeners = new Set<Listener>();

export function emitDomainEvent(evt: DomainEvent) {
	// Structured log – could later route to backend queue
	console.debug("[event]", evt.type, evt);
	for (const l of listeners) {
		try {
			l(evt);
		} catch {
			/* swallow listener error */
		}
	}
}

export function onDomainEvent(fn: Listener) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function buildEvent<
	T extends Record<string, unknown>,
	M extends Record<string, unknown> | undefined = Record<string, unknown>,
>(type: string, data: T, meta?: M): DomainEvent<T, M> {
	return { type, occurredAt: new Date().toISOString(), data, meta };
}
