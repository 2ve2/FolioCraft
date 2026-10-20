import { AsyncLocalStorage } from "node:async_hooks";

const requestIds = new AsyncLocalStorage<string>();

/** Carries the server-generated request ID through native authentication callbacks. */
export function withMailRequestId<T>(requestId: string, operation: () => T): T {
	return requestIds.run(requestId, operation);
}

/** Returns an opaque correlation ID, never an address or caller-provided header. */
export function mailRequestId() {
	return requestIds.getStore() ?? crypto.randomUUID();
}
