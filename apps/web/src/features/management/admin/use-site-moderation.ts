"use client";
import type { Locale } from "@ichnara/contracts";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { errorText } from "../shared";
import { text } from "../shared/copy";
import type { AdminSite } from "../shared/types";
import { useAdminRefresh } from "./admin-query";

/** Opens one site overview and submits its password-confirmed suspension or resumption. */
export function useSiteModeration(locale: Locale) {
	const t = text[locale];
	const refresh = useAdminRefresh();

	// Shared mutation feedback and the selected site form.
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [reason, setReason] = useState("");
	const [password, setPassword] = useState("");
	const [details, setDetails] = useState<AdminSite | null>(null);

	// Focus target and request epochs prevent stale-view completion work.
	const detailsHeading = useRef<HTMLHeadingElement>(null);

	// Move focus into the newly opened detail panel.
	useEffect(() => {
		if (details) detailsHeading.current?.focus();
	}, [details]);

	const mounted = useRef(true);
	const actionPending = useRef(false);
	const viewVersion = useRef(0);

	// Invalidate pending actions when this controller leaves the screen.
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			viewVersion.current += 1;
		};
	}, []);

	/** Runs the moderation mutation and translates its failure into current-view feedback. */
	async function act(operation: (isCurrent: () => boolean) => Promise<void>) {
		if (actionPending.current) return;
		actionPending.current = true;
		const version = viewVersion.current;

		/** Rejects completion work from stale requests, sessions or unmounted views. */
		const current = () => mounted.current && viewVersion.current === version;

		setBusy(true);
		setError("");
		setNotice("");
		try {
			await operation(current);
			// The write happened even if this view moved on, so stored console reads are stale either way.
			refresh();
			if (!current()) return;
			setNotice(t.saved);
		} catch (e) {
			if (current()) setError(errorText(e, locale));
		} finally {
			setPassword("");
			actionPending.current = false;
			if (mounted.current) setBusy(false);
		}
	}

	/** Loads one site overview only for the still-current administrator view. */
	function openSiteDetails(row: Pick<AdminSite, "id">, initialReason = "") {
		if (actionPending.current) return;
		actionPending.current = true;
		const version = ++viewVersion.current;

		/** Rejects completion work from stale requests, sessions or unmounted views. */
		const current = () => mounted.current && viewVersion.current === version;

		setBusy(true);
		setReason("");
		setPassword("");
		setError("");
		api<AdminSite>(`/api/admin/sites/${row.id}`)
			.then((value) => {
				if (current()) {
					setDetails(value);
					setReason(initialReason.slice(0, 500));
				}
			})
			.catch((e) => {
				if (current()) setError(errorText(e, locale));
			})
			.finally(() => {
				actionPending.current = false;
				if (mounted.current) setBusy(false);
			});
	}

	/** Submits the required moderation reason and resets the matching detail state. */
	function moderateSite(row: AdminSite) {
		return act(async (isCurrent) => {
			await api(`/api/admin/sites/${row.id}/${row.suspended ? "resume" : "suspend"}`, "POST", {
				reason: reason.trim(),
				password,
			});
			if (!isCurrent()) return;
			setReason("");
			setPassword("");
			setDetails(null);
		});
	}

	/** Closes the selected site overview without changing stored site data. */
	function closeSiteDetails() {
		viewVersion.current += 1;
		setDetails(null);
		setReason("");
		setPassword("");
	}

	return {
		busy,
		error,
		notice,
		reason,
		setReason,
		password,
		setPassword,
		details,
		detailsHeading,
		openSiteDetails,
		moderateSite,
		closeSiteDetails,
	};
}
