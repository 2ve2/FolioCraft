"use client";
import type { Locale } from "@folio/contracts";
import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../../lib/api";
import { text } from "./copy";
import styles from "./management.module.css";
import type { Page } from "./types";
export function errorText(error: unknown, locale: Locale) {
	const t = text[locale];
	if (error instanceof ApiError) {
		if (error.status === 429) return t.rateLimited;
		if (error.code === "YOU_CANNOT_BAN_YOURSELF" || error.code === "YOU_CANNOT_REMOVE_YOURSELF")
			return t.protectedAccount;
		if (error.code.startsWith("YOU_ARE_NOT_ALLOWED")) return t.forbidden;
		if (error.code === "PUBLICATION_CONFLICT") return t.conflict;
		if (error.code === "MODERATION_CONFLICT") return t.moderationConflict;
		if (error.status === 401 || error.code === "EMAIL_NOT_VERIFIED") return t.denied;
		if (error.status === 403) return t.forbidden;
		if (error.status === 0) return t.unavailable;
	}
	return t.failed;
}
/** Keep native Better Auth status/code while preserving its response protocol. */
export function nativeError(error: { code?: string; message?: string; status: number }) {
	return new ApiError(
		error.code || "REQUEST_FAILED",
		error.message || "Request failed",
		error.status,
	);
}
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
	const reload = useCallback(() => setVersion((v) => v + 1), []);
	return { data, error, loading, reload };
}
export function Pager({
	count,
	offset,
	hasMore,
	disabled,
	locale,
	change,
}: {
	count: number;
	offset: number;
	hasMore: boolean;
	disabled: boolean;
	locale: Locale;
	change: (offset: number) => void;
}) {
	const t = text[locale];
	return (
		<div className={styles.actions}>
			<button
				type="button"
				disabled={disabled || offset === 0}
				onClick={() => change(Math.max(0, offset - 20))}
			>
				{t.previous}
			</button>
			<span>{count ? `${offset + 1}–${offset + count}` : "0"}</span>
			<button
				type="button"
				disabled={disabled || !hasMore || offset >= 10000}
				onClick={() => change(offset + 20)}
			>
				{t.next}
			</button>
			{hasMore && offset >= 10000 && <span>{t.bounded}</span>}
		</div>
	);
}
export function date(value: string, locale: Locale) {
	return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
		calendar: "gregory",
		dateStyle: "medium",
		timeStyle: "short",
	});
}
