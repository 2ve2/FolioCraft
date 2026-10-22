import { Client, type ClientConfig } from "pg";

/** Request-local counters only; never retain SQL, values, results, addresses or credentials. */
export function databaseTiming() {
	const totals = { connections: 0, connectionMs: 0, queries: 0, queryMs: 0, queryErrors: 0 };
	class TimedClient extends Client {
		constructor(config?: ClientConfig) {
			super(config);
			const started = performance.now();
			this.once("connect", () => {
				totals.connections++;
				totals.connectionMs += performance.now() - started;
			});
			// Preserve pg's promise/callback overloads and this binding, including Drizzle transactions.
			this.query = new Proxy(this.query, {
				apply(target, receiver, argumentsList) {
					const start = performance.now();
					let finished = false;
					const finish = (failed: boolean) => {
						if (finished) return;
						finished = true;
						totals.queries++;
						totals.queryMs += performance.now() - start;
						if (failed) totals.queryErrors++;
					};
					const last = argumentsList.length - 1;
					const callback = argumentsList[last];
					if (typeof callback === "function") {
						argumentsList[last] = (...values: unknown[]) => {
							finish(Boolean(values[0]));
							return Reflect.apply(callback, undefined, values);
						};
					}
					try {
						const result = Reflect.apply(target, receiver, argumentsList);
						if (result instanceof Promise)
							return result.then(
								(value) => {
									finish(false);
									return value;
								},
								(error: unknown) => {
									finish(true);
									throw error;
								},
							);
						return result;
					} catch (error) {
						finish(true);
						throw error;
					}
				},
			});
		}
	}
	return { Client: TimedClient, totals };
}
