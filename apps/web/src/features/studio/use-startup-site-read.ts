"use client";
import { type Site, studioSessionSchema } from "@ichnara/contracts";
import { useEffect, useRef } from "react";
import { apiEnvelope, authClient } from "../../lib/api";
import {
	canObserveRemoteSessionChanges,
	subscribeRemoteSessionChanges,
} from "../../lib/auth-client";
import { signedInCookie } from "../../lib/signed-in-hint";
import { createStartupSiteRead, type StartupSession } from "./startup-site-read";

/** Reads the native atom synchronously so React scheduling cannot authorize a stale result. */
export function startupSession(): StartupSession {
	const state = authClient.$store.atoms.session.get();
	return {
		identity: state.data?.user ? `${state.data.user.id}:${state.data.session.id}` : "",
		pending: state.isPending || state.isRefetching,
		error: Boolean(state.error),
	};
}

/** Starts hinted owned-site reads alongside native session verification, only in this mount. */
export function useStartupSiteRead() {
	const read = useRef<ReturnType<typeof createStartupSiteRead<Site | null>> | null>(null);
	useEffect(() => {
		// Only the identity-free routing hint is read; the API's session cookie is never inspected.
		const hinted = document.cookie.split(";").some((part) => part.trim() === `${signedInCookie}=1`);
		if (!hinted || !canObserveRemoteSessionChanges) return;
		const initial = startupSession();
		let verified = Boolean(initial.identity && !initial.pending && !initial.error);
		let identity = initial.identity;
		const invalidate = () => read.current?.invalidate();
		const stopRemote = subscribeRemoteSessionChanges(() => {
			invalidate();
			void authClient.$store.atoms.session.get().refetch();
		});
		const stopSignal = authClient.$store.atoms.$sessionSignal.listen(invalidate);
		const stopSession = authClient.$store.atoms.session.listen(() => {
			const state = startupSession();
			if (
				(verified && (state.pending || state.identity !== identity)) ||
				(!state.pending && (!state.identity || state.error))
			)
				invalidate();
			if (!state.pending && state.identity) {
				verified = true;
				identity = state.identity;
			}
		});
		/** Better Auth 1.7.7 publishes native cross-tab session changes under this key. */
		const storage = (event: StorageEvent) => {
			if (event.key === null || event.key === "better-auth.message") invalidate();
		};
		window.addEventListener("storage", storage);
		read.current = createStartupSiteRead(async () => {
			const response = await apiEnvelope<Site | null>("/api/sites");
			const binding = studioSessionSchema.safeParse(response.sessionIdentity);
			return {
				value: response.result,
				identity: binding.success ? `${binding.data.userId}:${binding.data.sessionId}` : "",
			};
		}, initial.identity);
		return () => {
			invalidate();
			read.current = null;
			stopRemote();
			stopSignal();
			stopSession();
			window.removeEventListener("storage", storage);
		};
	}, []);
	return read;
}
