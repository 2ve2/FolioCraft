/** A speculative result is usable only after an unchanged, successful session verification. */
export type StartupSession = { identity: string; pending: boolean; error: boolean };
type ReadResult<T> = { accepted: true; value: T } | { accepted: false };

/** Holds one page-local read; cancellation wins even when the network promise is still pending. */
export function createStartupSiteRead<T>(
	read: () => Promise<{ value: T; identity: string }>,
	initialIdentity: string,
) {
	let valid = true;
	let consumed = false;
	let cancel: () => void = () => {};
	const cancelled = new Promise<ReadResult<{ value: T; identity: string }>>((resolve) => {
		cancel = () => resolve({ accepted: false });
	});
	const result: Promise<ReadResult<{ value: T; identity: string }>> = read().then(
		(value) => ({ accepted: true, value }),
		() => ({ accepted: false }),
	);
	return {
		/** Invalidates on native session mutations, cross-tab notifications or unmount. */
		invalidate() {
			valid = false;
			cancel();
		},
		/** Rechecks both session and generation after awaiting the speculative result. */
		async take(identity: string, session: () => StartupSession): Promise<ReadResult<T>> {
			const current = () => {
				const state = session();
				return (
					valid &&
					Boolean(identity) &&
					(!initialIdentity || initialIdentity === identity) &&
					state.identity === identity &&
					!state.pending &&
					!state.error
				);
			};
			if (consumed || !current()) return { accepted: false };
			consumed = true;
			const value = await Promise.race([result, cancelled]);
			return current() && value.accepted && value.value.identity === identity
				? { accepted: true, value: value.value.value }
				: { accepted: false };
		},
	};
}
