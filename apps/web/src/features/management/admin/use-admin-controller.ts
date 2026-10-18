"use client";
import type { Locale } from "@ichnara/contracts";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { errorText, usePage } from "../shared";
import { text } from "../shared/copy";
import type { AdminSite, AdminUser, Audit, Counts } from "../shared/types";
import { useAdminSession } from "./admin-context";

/** Coordinates guarded administrator requests, selection epochs and native account actions. */
export function useAdminController(locale: Locale, tab: "sites" | "audit" | "users") {
	const t = text[locale];
	const { permissions } = useAdminSession();
	const canReadSystem = permissions.includes("system.read");

	// Active resource tab, page and platform totals.
	const [siteFilter, setSiteFilter] = useState<"all" | "accessible" | "suspended">("all");
	const [offset, setOffset] = useState(0);
	const page = usePage<AdminSite | Audit | AdminUser>(
		`/api/admin/${tab}?limit=20&offset=${offset}${tab === "sites" && siteFilter !== "all" ? `&suspended=${siteFilter === "suspended"}` : ""}`,
		locale,
	);
	const [counts, setCounts] = useState<Counts | null>(null);
	const [countsLoading, setCountsLoading] = useState(true);
	const [countsError, setCountsError] = useState("");
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

	const users = (page.data?.items ?? []).filter((row): row is AdminUser => "email" in row);
	const userMore = Boolean(page.data?.hasMore);
	const usersLoaded = Boolean(page.data);
	const usersError = page.error;
	const userLoading = tab === "users" && page.loading;
	const [userVersion, setUserVersion] = useState(0);

	// Shared mutation feedback and the selected account/site forms.
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [reason, setReason] = useState("");
	const [selected, setSelected] = useState<AdminUser | null>(null);
	const [details, setDetails] = useState<AdminSite | null>(null);

	// Focus targets and request epochs prevent stale-view completion work.
	const selectedHeading = useRef<HTMLHeadingElement>(null);
	const detailsHeading = useRef<HTMLHeadingElement>(null);

	// Move focus into newly opened detail panels.
	useEffect(() => {
		if (selected) selectedHeading.current?.focus();
	}, [selected]);

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

	// biome-ignore lint/correctness/useExhaustiveDependencies: Refresh resource counts after a completed operation.
	useEffect(() => {
		let current = true;
		if (!canReadSystem) {
			setCounts(null);
			setCountsLoading(false);
			setCountsError("");
			return;
		}
		setCountsLoading(true);
		setCountsError("");
		api<Counts>("/api/admin/resources")
			.then((value) => {
				if (current) {
					setCounts(value);
					setUpdatedAt(new Date());
				}
			})
			.catch((e) => {
				if (current) setCountsError(errorText(e, locale));
			})
			.finally(() => {
				if (current) setCountsLoading(false);
			});
		return () => {
			current = false;
		};
	}, [locale, userVersion, canReadSystem]);

	/** Runs a management mutation and translates its failure into current-view feedback. */
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
			if (!current()) return;
			setNotice(t.saved);
			page.reload();
			setUserVersion((v) => v + 1);
		} catch (e) {
			if (current()) setError(errorText(e, locale));
		} finally {
			actionPending.current = false;
			if (mounted.current) setBusy(false);
		}
	}

	/** Filters server-side site access and resets selection and pagination. */
	function changeSiteFilter(value: "all" | "accessible" | "suspended") {
		if (actionPending.current) return;
		viewVersion.current += 1;
		setSiteFilter(value);
		setOffset(0);
		setDetails(null);
		setReason("");
		setError("");
		setNotice("");
	}

	/** Refreshes domain pages, native users and administrative counts. */
	function refresh() {
		page.reload();
		setUserVersion((v) => v + 1);
	}

	/** Loads one site overview only for the still-current administrator view. */
	function openSiteDetails(row: AdminSite) {
		if (actionPending.current) return;
		actionPending.current = true;
		const version = ++viewVersion.current;

		/** Rejects completion work from stale requests, sessions or unmounted views. */
		const current = () => mounted.current && viewVersion.current === version;

		setBusy(true);
		setReason("");
		setError("");
		api<AdminSite>(`/api/admin/sites/${row.id}`)
			.then((value) => {
				if (current()) setDetails(value);
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
			});
			if (!isCurrent()) return;
			setReason("");
			setDetails(null);
		});
	}

	/** Closes the selected site overview without changing stored site data. */
	function closeSiteDetails() {
		viewVersion.current += 1;
		setDetails(null);
	}

	/** Selects a native account and resets its identity-confirmation fields. */
	function openUser(user: AdminUser) {
		viewVersion.current += 1;
		setSelected(user);
		setReason("");
	}

	/** Closes account management and invalidates stale selection work. */
	function closeUser() {
		viewVersion.current += 1;
		setSelected(null);
		setReason("");
	}

	/** Changes the administrative page and clears stale user or site selections. */
	function changePage(next: number) {
		viewVersion.current += 1;
		setSelected(null);
		setDetails(null);
		setOffset(next);
	}

	return {
		tab,
		offset,
		page,
		counts,
		users,
		userMore,
		usersLoaded,
		usersError,
		userLoading,
		busy,
		error,
		notice,
		reason,
		setReason,
		selected,
		details,
		selectedHeading,
		detailsHeading,
		changeSiteFilter,
		siteFilter,
		countsLoading,
		countsError,
		updatedAt,
		refresh,
		openSiteDetails,
		moderateSite,
		openUser,
		closeUser,
		closeSiteDetails,
		changePage,
	};
}
