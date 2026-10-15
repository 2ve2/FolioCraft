"use client";
import type { Locale } from "@folio/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { errorText } from "./errors";
import type { Page } from "./types";

/** Loads a bounded resource page and discards superseded responses. */
export function usePage<T>(path: string, locale: Locale) {
	const [data, setData] = useState<Page<T> | null>(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [version, setVersion] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refresh invalidation reruns this request.
	useEffect(() => {
		let current = true;
		setData(null);
		setLoading(true);
		setError("");
		api<Page<T>>(path)
			.then((value) => {
				if (current) setData(value);
			})
			.catch((e) => {
				if (current) setError(errorText(e, locale));
			})
			.finally(() => {
				if (current) setLoading(false);
			});
		return () => {
			current = false;
		};
	}, [path, locale, version]);

	/** Invalidates the current resource page for an explicit reread. */
	const reload = useCallback(() => setVersion((v) => v + 1), []);

	return { data, error, loading, reload };
}
