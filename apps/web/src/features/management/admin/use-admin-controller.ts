"use client";
import type { Locale } from "@folio/contracts";
import { useEffect, useRef, useState } from "react";
import { api, authClient } from "../../../lib/api";
import { errorText, nativeError, usePage } from "../shared";
import { text } from "../shared/copy";
import type { AdminSite, AdminUser, Audit, Counts } from "../shared/types";

/** Coordinates guarded administrator requests, selection epochs and native account actions. */
export function useAdminController(locale: Locale) {
	const t = text[locale];
	const [tab, setTab] = useState<"sites" | "audit" | "users">("sites");
	const [offset, setOffset] = useState(0);
	const page = usePage<AdminSite | Audit>(
		`/api/admin/${tab === "users" ? "sites" : tab}?limit=20&offset=${offset}`,
		locale,
	);
	const [counts, setCounts] = useState<Counts | null>(null);
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [userMore, setUserMore] = useState(false);
	const [usersLoaded, setUsersLoaded] = useState(false);
	const [usersError, setUsersError] = useState("");
	const [userLoading, setUserLoading] = useState(false);
	const [userVersion, setUserVersion] = useState(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [reason, setReason] = useState("");
	const [selected, setSelected] = useState<AdminUser | null>(null);
	const [confirmation, setConfirmation] = useState("");
	const [role, setRole] = useState<"user" | "admin">("user");
	const [details, setDetails] = useState<AdminSite | null>(null);
	const selectedHeading = useRef<HTMLHeadingElement>(null);
	const detailsHeading = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		if (selected) selectedHeading.current?.focus();
	}, [selected]);
	useEffect(() => {
		if (details) detailsHeading.current?.focus();
	}, [details]);
	const mounted = useRef(true);
	const actionPending = useRef(false);
	const viewVersion = useRef(0);
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
		api<Counts>("/api/admin/resources")
			.then((value) => {
				if (current) setCounts(value);
			})
			.catch((e) => {
				if (current) setError(errorText(e, locale));
			});
		return () => {
			current = false;
		};
	}, [locale, userVersion]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refresh invalidates the official identity list.
	useEffect(() => {
		if (tab !== "users") return;
		let current = true;
		setUserLoading(true);
		setUsers([]);
		setUserMore(false);
		setUsersLoaded(false);
		setUsersError("");
		authClient.admin
			.listUsers({ query: { limit: 20, offset, sortBy: "createdAt", sortDirection: "desc" } })
			.then((result) => {
				if (!current) return;
				if (result.error) throw nativeError(result.error);
				setUsers(result.data.users);
				setUsersLoaded(true);
				setUserMore(offset + result.data.users.length < result.data.total);
			})
			.catch((e) => {
				if (current) {
					setUserMore(false);
					setUsersError(errorText(e, locale));
				}
			})
			.finally(() => {
				if (current) setUserLoading(false);
			});
		return () => {
			current = false;
		};
	}, [tab, offset, userVersion, locale]);

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

	/** Runs a confirmed native account action without bypassing Better Auth. */
	async function native(action: "ban" | "unban" | "revoke" | "role") {
		if (!selected || confirmation !== selected.id) return;
		if (action === "ban" && (reason.trim().length < 3 || reason.trim().length > 500)) {
			setError(t.reasonInvalid);
			return;
		}
		const userId = selected.id;
		const version = viewVersion.current;
		await act(async () => {
			const result =
				action === "ban"
					? await authClient.admin.banUser({ userId, banReason: reason.trim() })
					: action === "unban"
						? await authClient.admin.unbanUser({ userId })
						: action === "revoke"
							? await authClient.admin.revokeUserSessions({ userId })
							: await authClient.admin.setRole({ userId, role });
			if (result.error) throw nativeError(result.error);
			if (!mounted.current || viewVersion.current !== version) return;
			setSelected(null);
			setConfirmation("");
			setReason("");
		});
	}

	/** Changes the administrative tab and invalidates stale selection feedback. */
	function changeTab(value: "sites" | "audit" | "users") {
		viewVersion.current += 1;
		setTab(value);
		setOffset(0);
		setSelected(null);
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
		setConfirmation("");
		setReason("");
		setRole(user.role === "admin" ? "admin" : "user");
	}

	/** Closes account management and invalidates stale selection work. */
	function closeUser() {
		viewVersion.current += 1;
		setSelected(null);
		setConfirmation("");
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
		confirmation,
		setConfirmation,
		role,
		setRole,
		details,
		selectedHeading,
		detailsHeading,
		native,
		changeTab,
		refresh,
		openSiteDetails,
		moderateSite,
		openUser,
		closeUser,
		closeSiteDetails,
		changePage,
	};
}
