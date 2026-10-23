"use client";
import type { Locale } from "@ichnara/contracts";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useState } from "react";
import { ApiError, api } from "../../../lib/api";
import { errorText } from "../shared";

/** Every console read lives under this key, so one invalidation refreshes the whole console. */
const ADMIN_KEY = "admin";

/** Retries once only when the API was unreachable or failed on the server; denials never repeat. */
function retryTransient(failures: number, error: unknown) {
	return failures < 1 && error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

/**
 * Holds console reads for one administrator session. The shell keys this provider by session, so a
 * different session starts from an empty cache, and the cache is dropped when the console unmounts
 * (sign-out or leaving the console). Revealed account emails and other write results never enter it.
 */
export function AdminQueryProvider({ children }: { children: ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					// Returning to a page within 30 s shows its cached rows without a request; older rows stay
					// visible while a background read (navigation, tab focus, reconnect) replaces them.
					queries: { staleTime: 30_000, retry: retryTransient },
				},
			}),
	);
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Reads one console resource; `null` skips the request. Errors are translated at render time. */
export function useAdminData<T>(path: string | null, locale: Locale) {
	const client = useQueryClient();
	const query = useQuery({
		queryKey: [ADMIN_KEY, path],
		queryFn: () => api<T>(path as string),
		enabled: path !== null,
	});
	const { refetch } = query;
	return {
		data: query.data ?? null,
		// Shown only without rows: a failed background reread keeps the last good rows on screen (as the
		// account session does on tab return), and a retry in progress shows the loading state.
		error:
			query.isError && !query.isFetching && query.data === undefined
				? errorText(query.error, locale)
				: "",
		reload: useCallback(() => void refetch(), [refetch]),
		/** Stores a write's authoritative result so the page shows it before the reread completes. */
		set: useCallback((value: T) => client.setQueryData([ADMIN_KEY, path], value), [client, path]),
	};
}

/** Marks every console read stale after a completed write; visible pages reread immediately. */
export function useAdminRefresh() {
	const client = useQueryClient();
	return useCallback(() => void client.invalidateQueries({ queryKey: [ADMIN_KEY] }), [client]);
}
