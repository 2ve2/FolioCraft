"use client";
import {
	collectAssetIds,
	type Draft,
	draftSchema,
	type Site,
	slugSchema,
} from "@ichnara/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, authClient } from "../../lib/api";
import { useInterfaceLocale } from "../../lib/use-interface-locale";
import { useAssetUrls } from "../assets/use-asset-urls";
import { copy } from "./copy";
import { formatDraftIssues } from "./draft-errors";
import { DraftImportError, readDraftBackup } from "./draft-import";
import type { SaveState, Section } from "./types";

/** Owns authenticated draft loading, recovery, revisioned saves and publication operations. */
export function useStudioController() {
	// Session identity and the current owned workspace.
	const [locale, setLocale, localeReady] = useInterfaceLocale();
	const t = copy[locale];
	const {
		data: session,
		isPending,
		error: sessionError,
		refetch: refetchSession,
	} = authClient.useSession();
	const sessionIdentity = `${session?.user.id ?? ""}:${session?.session.id ?? ""}`;
	const sessionIdentityRef = useRef(sessionIdentity);
	sessionIdentityRef.current = sessionIdentity;
	const siteLoadVersion = useRef(0);
	const workspaceOwner = useRef("");
	const intentionalLogout = useRef(false);
	const recoveries = useRef(new Map<string, { site: Site; draft: Draft; savedJson: string }>());
	const [site, setSite] = useState<Site | null>(null);
	const [draft, setDraft] = useState<Draft | null>(null);
	const assetUrls = useAssetUrls(site?.id, draft ? collectAssetIds(draft) : []);
	const [loaded, setLoaded] = useState(false);
	const [loadedIdentity, setLoadedIdentity] = useState("");
	const [loadError, setLoadError] = useState(false);
	const [section, setSection] = useState<Section>("content");
	const [saveState, setSaveState] = useState<SaveState>("saved");
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [busy, setBusy] = useState(false);
	const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
	const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
	const [expandedPreview, setExpandedPreview] = useState(false);
	// Mutable save coordination stays together to preserve session and publication ordering.
	const siteRef = useRef<Site | null>(null);
	const draftRef = useRef<Draft | null>(null);
	const saveJob = useRef<{ identity: string; promise: Promise<void> } | null>(null);
	const savedJson = useRef("");
	const dirty = useRef(false);
	const mounted = useRef(true);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const operation = useRef(false);
	const publicationVersion = useRef(0);

	/** Keeps the operation guard and visible busy state synchronized. */
	const operationsBusy = useCallback((active: boolean) => {
		operation.current = active;
		setBusy(active);
	}, []);

	const textRef = useRef(t);
	textRef.current = t;

	/** Translates domain failures using the current interface language. */
	const explain = useCallback((e: unknown): string => {
		const c = textRef.current;
		if (e instanceof ApiError) {
			if (e.status === 401) return c.sessionExpired;
			if (e.status === 409) return c.conflict;
			if (e.status === 0) return c.unavailable;
			if (e.status === 400 || e.status === 422) return c.invalid;
		}
		return c.error;
	}, []);

	useEffect(() => {
		mounted.current = true;
		if (window.matchMedia("(max-width: 720px)").matches) setDevice("mobile");
		return () => {
			mounted.current = false;
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);

	/** Accepts an owned server snapshot and resets the matching save baseline. */
	const acceptSite = useCallback((value: Site | null) => {
		setLoadedIdentity(sessionIdentityRef.current);
		workspaceOwner.current = value ? sessionIdentityRef.current.split(":")[0] : "";
		siteRef.current = value;
		draftRef.current = value?.draft || null;
		savedJson.current = value ? JSON.stringify(value.draft) : "";
		dirty.current = false;
		setSite(value);
		setDraft(value?.draft || null);
		setSaveState("saved");
		setError("");
	}, []);

	/** Retains unsaved edits only for their owning account during session recovery. */
	const rememberEdits = useCallback(() => {
		if (
			!intentionalLogout.current &&
			dirty.current &&
			workspaceOwner.current &&
			siteRef.current &&
			draftRef.current
		)
			recoveries.current.set(workspaceOwner.current, {
				site: siteRef.current,
				draft: draftRef.current,
				savedJson: savedJson.current,
			});
	}, []);

	/** Loads the owned site and recovers matching in-memory edits when requested. */
	const loadSite = useCallback(
		async (recover = false) => {
			const identity = sessionIdentityRef.current;
			const owner = identity.split(":")[0];
			if (recover) rememberEdits();
			const version = ++siteLoadVersion.current;

			/** Rejects completion work from stale requests, sessions or unmounted views. */
			const current = () =>
				identity === sessionIdentityRef.current &&
				version === siteLoadVersion.current &&
				mounted.current;

			setLoadError(false);
			setLoaded(false);
			try {
				const value = await api<Site | null>("/api/sites");
				if (!current()) return;
				acceptSite(value);
				const previous = recoveries.current.get(owner);
				if (recover && value && previous?.site.id === value.id) {
					const restored = { ...value, revision: previous.site.revision };
					siteRef.current = restored;
					draftRef.current = previous.draft;
					savedJson.current = previous.savedJson;
					dirty.current = JSON.stringify(previous.draft) !== previous.savedJson;
					setSite(restored);
					setDraft(previous.draft);
					setSaveState(dirty.current ? "unsaved" : "saved");
					setNotice(
						textRef.current === copy.ar
							? "استعدنا تعديلاتك غير المحفوظة لهذا الحساب. راجعها قبل الحفظ."
							: "Your unsaved edits for this account were recovered. Review them before saving.",
					);
					if (value.revision !== previous.site.revision) {
						setSaveState("failed");
						setError(textRef.current.conflict);
					}
				}
				recoveries.current.delete(owner);
			} catch {
				if (current()) setLoadError(true);
			} finally {
				if (current()) setLoaded(true);
			}
		},
		[acceptSite, rememberEdits],
	);

	const userId = session?.user?.id;
	const requestedIdentity = useRef("");
	useEffect(() => {
		if (userId && !isPending) {
			if (requestedIdentity.current !== sessionIdentity) {
				requestedIdentity.current = sessionIdentity;
				if (timer.current) clearTimeout(timer.current);
				operation.current = false;
				setBusy(false);
				void loadSite(true);
			}
		} else if (!isPending) {
			requestedIdentity.current = "";
			siteLoadVersion.current += 1;
			rememberEdits();
			if (timer.current) clearTimeout(timer.current);
			operation.current = false;
			setBusy(false);
			acceptSite(null);
			setLoaded(false);
		}
	}, [userId, sessionIdentity, isPending, loadSite, acceptSite, rememberEdits]);

	useEffect(() => {
		/** Warns before navigation when the current draft has unsaved edits. */
		const warn = (event: BeforeUnloadEvent) => {
			if (dirty.current) {
				event.preventDefault();
			}
		};

		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, []);

	/** Serializes revisioned draft writes before publication or another owned operation. */
	const flush = useCallback(async () => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		while (saveJob.current) {
			const pending = saveJob.current;
			try {
				await pending.promise;
			} catch (error) {
				if (pending.identity === sessionIdentityRef.current) throw error;
			}
			if (!dirty.current || !siteRef.current || !draftRef.current) return;
			if (saveJob.current === pending) saveJob.current = null;
		}
		const jobIdentity = sessionIdentityRef.current;

		/** Persists pending draft snapshots until the current owner has no unsaved changes. */
		const task = async () => {
			const identity = sessionIdentityRef.current;
			while (
				identity === sessionIdentityRef.current &&
				dirty.current &&
				siteRef.current &&
				draftRef.current
			) {
				const snapshot = draftRef.current;
				const validation = draftSchema.safeParse(snapshot);
				if (!validation.success) {
					setSaveState("failed");
					const paths = formatDraftIssues(validation.error.issues, textRef.current === copy.ar);
					setError(`${textRef.current.invalid} (${paths})`);
					throw new Error("Invalid draft");
				}
				const json = JSON.stringify(snapshot);
				setSaveState("saving");
				setError("");
				try {
					const current = siteRef.current;
					const publicationAtSave = publicationVersion.current;
					let saved = await api<Site>(`/api/sites/${current.id}/draft`, "PUT", {
						revision: current.revision,
						draft: snapshot,
					});
					if (identity !== sessionIdentityRef.current || !mounted.current) return;
					if (publicationVersion.current !== publicationAtSave && siteRef.current?.id === saved.id)
						saved = { ...saved, publishedReleaseId: siteRef.current.publishedReleaseId };
					siteRef.current = saved;
					savedJson.current = json;
					if (!mounted.current) return;
					setSite(saved);
					dirty.current = JSON.stringify(draftRef.current) !== json;
					setSaveState(dirty.current ? "unsaved" : "saved");
				} catch (e) {
					if (identity !== sessionIdentityRef.current || !mounted.current) return;
					setSaveState("failed");
					setError(explain(e));
					throw e;
				}
			}
		};

		const promise = task();
		const job = { identity: jobIdentity, promise };
		saveJob.current = job;
		try {
			await promise;
		} finally {
			if (saveJob.current === job) saveJob.current = null;
		}
	}, [explain]);

	/** Applies a local draft edit and schedules its guarded autosave. */
	const update = (value: Draft | ((current: Draft) => Draft)) => {
		if (!draftRef.current) return;
		const next = typeof value === "function" ? value(draftRef.current) : value;
		if (operation.current) return;
		draftRef.current = next;
		setDraft(next);
		dirty.current = JSON.stringify(next) !== savedJson.current;
		setSaveState(dirty.current ? "unsaved" : "saved");
		if (!dirty.current) setError("");
		setNotice("");
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			void flush().catch(() => undefined);
		}, 900);
	};

	/** Creates an owned site from the validated address and chosen content language. */
	async function createSite(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		const data = new FormData(event.currentTarget);
		const slug = String(data.get("slug")).trim().toLowerCase();
		if (!slugSchema.safeParse(slug).success) {
			setError(t.slugError);
			return;
		}
		const identity = sessionIdentityRef.current;
		setBusy(true);
		try {
			const created = await api<Site>("/api/sites", "POST", {
				slug,
				locale: String(data.get("locale")),
			});
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			acceptSite(created);
		} catch (e) {
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			setError(e instanceof ApiError && e.status === 409 ? t.slugTaken : explain(e));
		} finally {
			if (identity === sessionIdentityRef.current && mounted.current) setBusy(false);
		}
	}

	/** Flushes draft edits before requesting an atomic public release. */
	async function publish() {
		if (operation.current) return;
		const value = draftRef.current;
		if (!value?.profile.name.trim() || !value.profile.role.trim()) {
			setError(t.requiredPublish);
			setMobileTab("edit");
			setSection("content");
			return;
		}
		const identity = sessionIdentityRef.current;
		operation.current = true;
		setBusy(true);
		setNotice("");
		try {
			await flush();
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			const current = siteRef.current;
			if (!current) throw new ApiError("SESSION_EXPIRED", "Session expired", 401);
			const release = await api<{ id: string; revision: number }>(
				`/api/sites/${current.id}/releases`,
				"POST",
				{ revision: current.revision },
			);
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			publicationVersion.current += 1;
			const next = { ...current, publishedReleaseId: release.id };
			siteRef.current = next;
			setSite(next);
			setNotice(textRef.current.publishSuccess);
			setError("");
		} catch (e) {
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			if (!(e instanceof Error && e.message === "Invalid draft")) setError(explain(e));
		} finally {
			if (identity === sessionIdentityRef.current && mounted.current) {
				operation.current = false;
				setBusy(false);
			}
		}
	}

	/** Clears public availability only after confirmation and a successful server response. */
	async function unpublish() {
		if (operation.current || !window.confirm(t.unpublishConfirm)) return;
		const identity = sessionIdentityRef.current;
		operation.current = true;
		setBusy(true);
		setNotice("");
		setError("");
		try {
			const current = siteRef.current;
			if (!current) throw new ApiError("SESSION_EXPIRED", "Session expired", 401);
			await api(`/api/sites/${current.id}/unpublish`, "POST");
			if (
				identity !== sessionIdentityRef.current ||
				!mounted.current ||
				siteRef.current?.id !== current.id
			)
				return;
			publicationVersion.current += 1;
			const next = { ...siteRef.current, publishedReleaseId: null };
			siteRef.current = next;
			setSite(next);
			setNotice(textRef.current.unpublishedSuccess);
		} catch (e) {
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			setError(explain(e));
		} finally {
			if (identity === sessionIdentityRef.current && mounted.current) {
				operation.current = false;
				setBusy(false);
			}
		}
	}

	/** Signs out through Better Auth after handling unsaved work safely. */
	async function logout() {
		if (saveJob.current) {
			setError(t.savingWait);
			return;
		}
		if (dirty.current && !window.confirm(t.signoutConfirm)) return;
		if (timer.current) clearTimeout(timer.current);
		setBusy(true);
		setError("");
		try {
			intentionalLogout.current = true;
			const result = await authClient.signOut();
			if (result.error) throw new Error("Signout failed");
			recoveries.current.delete(workspaceOwner.current);
			acceptSite(null);
			await refetchSession();
		} catch {
			setError(t.unavailable);
		} finally {
			intentionalLogout.current = false;
			setBusy(false);
		}
	}

	/** Saves owned edits before leaving the studio for the independent administration area. */
	async function openAdministration() {
		if (operation.current) return;
		const identity = sessionIdentityRef.current;
		operation.current = true;
		setBusy(true);
		try {
			await flush();
			if (identity === sessionIdentityRef.current && mounted.current)
				window.location.assign(`/admin?lang=${locale}`);
		} catch {
			// The revisioned save already reports the specific validation or network failure.
		} finally {
			if (identity === sessionIdentityRef.current && mounted.current) {
				operation.current = false;
				setBusy(false);
			}
		}
	}

	// Owned settings and backup operations.

	/** Flushes the current draft before changing the owned site's revisioned address. */
	async function renameSite(slug: string) {
		if (operation.current) return;
		const identity = sessionIdentityRef.current;
		operation.current = true;
		setBusy(true);
		setError("");
		try {
			await flush();
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			const current = siteRef.current;
			if (!current) return;
			const result = await api<Site>(`/api/sites/${current.id}`, "PATCH", {
				revision: current.revision,
				slug,
			});
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			acceptSite(result);
			setNotice(locale === "ar" ? "تم حفظ عنوان الموقع." : "Site address saved.");
		} catch (e) {
			if (identity !== sessionIdentityRef.current || !mounted.current) return;
			setError(
				e instanceof ApiError && e.code === "ALREADY_EXISTS"
					? textRef.current.slugTaken
					: explain(e),
			);
		} finally {
			if (identity === sessionIdentityRef.current && mounted.current) {
				operation.current = false;
				setBusy(false);
			}
		}
	}

	/** Downloads the current draft as a local JSON backup. */
	function exportDraft() {
		if (!draftRef.current) return;
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(draftRef.current, null, 2)], { type: "application/json" }),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${site?.slug || "portfolio"}-draft.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	/** Restores a validated backup through the owned revision guard before changing editor state. */
	async function importDraft(file: File) {
		if (operation.current || !siteRef.current) return;
		const identity = sessionIdentityRef.current;

		/** Rejects completion work from stale requests, sessions or unmounted views. */
		const current = () => identity === sessionIdentityRef.current && mounted.current;

		operation.current = true;
		setBusy(true);
		setError("");
		setNotice("");
		try {
			const imported = await readDraftBackup(file);
			if (!current()) return;
			if (timer.current) {
				clearTimeout(timer.current);
				timer.current = null;
			}
			// Settle earlier writes so a delayed autosave cannot overwrite the restored draft.
			if (saveJob.current) await saveJob.current.promise.catch(() => undefined);
			if (!current() || !siteRef.current) return;
			const owned = siteRef.current;
			const restored = await api<Site>(`/api/sites/${owned.id}/draft`, "PUT", {
				revision: owned.revision,
				draft: imported,
			});
			if (!current()) return;
			acceptSite(restored);
			setNotice(textRef.current.draftImportSaved);
		} catch (e) {
			if (!current()) return;
			setError(
				e instanceof DraftImportError
					? e.reason === "size"
						? textRef.current.draftImportSize
						: textRef.current.draftImportInvalid
					: e instanceof ApiError && e.code === "ASSET_NOT_READY_OR_OWNED"
						? textRef.current.draftImportAssets
						: explain(e),
			);
		} finally {
			if (current()) {
				operation.current = false;
				setBusy(false);
			}
		}
	}

	/** Updates the public pointer without replacing the local editing snapshot. */
	const publicationChanged = (value: Site) => {
		if (siteRef.current?.id !== value.id) return;
		if (siteRef.current.publishedReleaseId !== value.publishedReleaseId)
			setNotice(textRef.current.publicationUpdated);
		publicationVersion.current += 1;
		const next = { ...siteRef.current, publishedReleaseId: value.publishedReleaseId };
		siteRef.current = next;
		setSite(next);
	};

	/** Reloads saved data only after addressing any unsaved local changes. */
	function requestSavedReload() {
		if (!dirty.current || window.confirm(t.reloadConfirm)) void loadSite();
	}

	return {
		locale,
		localeReady,
		setLocale,
		t,
		session,
		isPending,
		sessionError,
		refetchSession,
		site,
		draft,
		loaded,
		loadError,
		loadedIdentity,
		sessionIdentity,
		loadSite,
		section,
		setSection,
		saveState,
		error,
		setError,
		notice,
		busy,
		mobileTab,
		setMobileTab,
		device,
		setDevice,
		expandedPreview,
		setExpandedPreview,
		assetUrls,
		update,
		createSite,
		publish,
		unpublish,
		logout,
		openAdministration,
		renameSite,
		exportDraft,
		importDraft,
		publicationChanged,
		operationsBusy,
		flush,
		requestSavedReload,
	};
}
