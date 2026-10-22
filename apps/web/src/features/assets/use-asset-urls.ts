"use client";
import { useEffect, useState } from "react";
import { ApiError, api, authClient } from "../../lib/api";

/** Resolves private URLs in bounded batches and renews their short-lived permission while mounted. */
export function useAssetUrls(siteId: string | undefined, ids: string[], refresh = 0) {
	return useAssetUrlState(siteId, ids, refresh).urls;
}

/** Also reports whether the current links are still being requested, so loading is not failure. */
export function useAssetUrlState(
	siteId: string | undefined,
	ids: string[],
	refresh = 0,
): { urls: Record<string, string>; loading: boolean } {
	const { data: session, isPending } = authClient.useSession();
	const owner = session?.user.id;
	const sessionId = session?.session.id;
	const idKey = JSON.stringify([...new Set(ids)].sort());
	const context = `${siteId ?? ""}:${owner ?? ""}:${sessionId ?? ""}:${idKey}:${refresh}`;
	const [state, setState] = useState<{ context: string; urls: Record<string, string> }>({
		context: "",
		urls: {},
	});
	useEffect(() => {
		let stopped = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let expiryTimer: ReturnType<typeof setTimeout> | undefined;
		let refreshing = false;
		let earliestExpiry = 0;
		if (!siteId || !owner || isPending) return;
		const assetIds = JSON.parse(idKey) as string[];
		if (!assetIds.length) return;

		/** Loads fresh links without retaining expired or rejected permissions. */
		async function renew() {
			if (stopped || refreshing) return;
			refreshing = true;
			const urls: Record<string, string> = {};
			const deadlines: Record<string, number> = {};
			let delay = 45_000;
			let cursor = 0;
			let denied = false;

			/** Limits parallel private download requests regardless of portfolio size. */
			async function worker() {
				while (!stopped && cursor < assetIds.length && !denied) {
					const id = assetIds[cursor++];
					try {
						const startedAt = Date.now();
						const result = await api<{ url: string; expiresIn: number }>(
							`/api/sites/${siteId}/assets/${id}/download`,
						);
						if (stopped) return;
						const remaining = result.expiresIn * 1000 - (Date.now() - startedAt);
						if (remaining > 10_000) {
							urls[id] = result.url;
							deadlines[id] = startedAt + result.expiresIn * 1000;
						}
					} catch (error) {
						if (error instanceof ApiError && [401, 403].includes(error.status)) denied = true;
						delay = Math.min(delay, 15_000);
					}
				}
			}

			await Promise.all(Array.from({ length: Math.min(4, assetIds.length) }, worker));
			refreshing = false;
			if (stopped) return;
			for (const [id, deadline] of Object.entries(deadlines)) {
				const remaining = deadline - Date.now();
				if (remaining <= 10_000) delete urls[id];
				delay = Math.min(delay, Math.max(5_000, remaining - 15_000));
			}
			setState({ context, urls: denied ? {} : urls });
			clearTimeout(expiryTimer);
			earliestExpiry = Math.min(...Object.keys(urls).map((id) => deadlines[id]));
			if (!denied && Number.isFinite(earliestExpiry)) {
				expiryTimer = setTimeout(
					() => {
						if (!stopped) setState({ context, urls: {} });
					},
					Math.max(0, earliestExpiry - Date.now()),
				);
			}
			if (!denied) timer = setTimeout(renew, delay);
		}

		/** Renews expired permissions when returning from a throttled background tab. */
		function onVisible() {
			if (document.visibilityState !== "visible" || Date.now() < earliestExpiry) return;
			setState({ context, urls: {} });
			clearTimeout(timer);
			void renew();
		}

		document.addEventListener("visibilitychange", onVisible);
		void renew();
		return () => {
			stopped = true;
			clearTimeout(timer);
			clearTimeout(expiryTimer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [siteId, owner, isPending, idKey, context]);
	const ready = !isPending && owner && state.context === context;
	return {
		urls: ready ? state.urls : {},
		loading: Boolean(siteId && ids.length) && !ready,
	};
}
