"use client";
import type { Locale } from "@ichnara/contracts";
import { AlertTriangle, ArrowLeft, Inbox, type LucideIcon, Search } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { SelectControl } from "../../../../components/ui/select-control";
import ui from "./console.module.css";
import { consoleCopy } from "./console-copy";

export { ui };

/** Page title row with an optional back link, inline badges, description and page actions. */
export function PageHeader({
	title,
	description,
	badges,
	actions,
	back,
}: {
	title: ReactNode;
	description?: ReactNode;
	badges?: ReactNode;
	actions?: ReactNode;
	back?: { href: string; label: string };
}) {
	return (
		<header className={ui.header}>
			<div className={ui.headerText}>
				{back && (
					<Link className={ui.back} href={back.href}>
						<ArrowLeft size={15} aria-hidden="true" />
						{back.label}
					</Link>
				)}
				<div className={ui.titleRow}>
					<h1 className={ui.title} dir="auto">
						{title}
					</h1>
					{badges}
				</div>
				{description && <p className={ui.description}>{description}</p>}
			</div>
			{actions && <div className={ui.headerActions}>{actions}</div>}
		</header>
	);
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/** Rounded status pill; the tone carries meaning only together with the text. */
export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
	return (
		<span className={ui.badge} data-tone={tone}>
			{children}
		</span>
	);
}

/** One metric tile; with `href` the whole tile opens the matching list. */
export function StatCard({
	label,
	value,
	icon: Icon,
	detail,
	href,
	tone,
}: {
	label: string;
	value: ReactNode;
	icon: LucideIcon;
	detail?: ReactNode;
	href?: string;
	tone?: Tone;
}) {
	const body = (
		<>
			<div className={ui.statHead}>
				<p className={ui.statLabel}>{label}</p>
				<span className={ui.statIcon} aria-hidden="true">
					<Icon size={17} />
				</span>
			</div>
			<p className={ui.statValue}>{value}</p>
			{detail && <p className={ui.statDetail}>{detail}</p>}
		</>
	);
	return href ? (
		<Link className={`${ui.stat} ${ui.statLink}`} href={href} data-tone={tone}>
			{body}
		</Link>
	) : (
		<div className={ui.stat} data-tone={tone}>
			{body}
		</div>
	);
}

/** Bordered card with an optional title, description and header actions. */
export function Panel({
	title,
	description,
	actions,
	children,
	padded = true,
}: {
	title?: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	padded?: boolean;
}) {
	return (
		<section className={ui.panel}>
			{(title || actions) && (
				<div className={ui.panelHeader}>
					<div>
						{title && <h2 className={ui.panelTitle}>{title}</h2>}
						{description && <p className={ui.panelDescription}>{description}</p>}
					</div>
					{actions && <div className={ui.headerActions}>{actions}</div>}
				</div>
			)}
			{padded ? <div className={ui.panelBody}>{children}</div> : children}
		</section>
	);
}

/** Label/value pairs in a responsive grid; `mono` values are identifiers shown left to right. */
export function KeyValues({
	items,
}: {
	items: { label: string; value: ReactNode; mono?: boolean; hidden?: boolean }[];
}) {
	return (
		<dl className={ui.keyValues}>
			{items
				.filter((item) => !item.hidden)
				.map((item) => (
					<div key={item.label}>
						<dt>{item.label}</dt>
						<dd>
							{item.mono ? (
								<bdi className={ui.mono} dir="ltr">
									{item.value ?? "—"}
								</bdi>
							) : (
								(item.value ?? "—")
							)}
						</dd>
					</div>
				))}
		</dl>
	);
}

/** Initials avatar for people; purely decorative beside the visible name. */
export function Avatar({ name }: { name: string }) {
	const initials =
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0])
			.join("")
			.toUpperCase() || "?";
	return (
		<span className={ui.avatar} aria-hidden="true">
			{initials}
		</span>
	);
}

/** Icon, title and explanation for empty or failed regions, with an optional action. */
export function StateMessage({
	icon: Icon = Inbox,
	title,
	text,
	action,
	tone,
}: {
	icon?: LucideIcon;
	title: string;
	text?: string;
	action?: ReactNode;
	tone?: "danger";
}) {
	return (
		<div className={ui.state} data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
			<span className={ui.stateIcon} aria-hidden="true">
				<Icon size={20} />
			</span>
			<p className={ui.stateTitle}>{title}</p>
			{text && <p className={ui.stateText}>{text}</p>}
			{action}
		</div>
	);
}

/** Returns `value` after it has been stable for `delay` ms (search fields read once typing pauses). */
export function useDebouncedValue<T>(value: T, delay = 300) {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setSettled(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return settled;
}

/** Search box with a leading icon; the visible placeholder is backed by an accessible label. */
export function SearchField({
	label,
	value,
	onChange,
	maxLength = 100,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	maxLength?: number;
}) {
	return (
		<div className={ui.search}>
			<Search className={ui.searchIcon} size={16} aria-hidden="true" />
			<input
				className={ui.input}
				type="search"
				aria-label={label}
				placeholder={label}
				value={value}
				maxLength={maxLength}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}

/** Compact labelled select for toolbars; the first option is always "all". */
export function FilterSelect({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
}) {
	return (
		<div className={ui.filter}>
			<span>{label}</span>
			<SelectControl label={label} value={value} onChange={onChange} options={options} />
		</div>
	);
}

/** Search and filters above a table, with a clear action while any filter is set. */
export function Toolbar({
	children,
	active,
	onClear,
	locale,
}: {
	children: ReactNode;
	active: boolean;
	onClear: () => void;
	locale: Locale;
}) {
	return (
		<div className={ui.toolbar}>
			{children}
			{active && (
				<button type="button" className={ui.buttonGhost} onClick={onClear}>
					{consoleCopy[locale].clearFilters}
				</button>
			)}
		</div>
	);
}

export type Column<T> = {
	key: string;
	header: string;
	cell: (row: T) => ReactNode;
	align?: "end" | "center";
	/** The card title on phones; the column header is not repeated beside it. */
	primary?: boolean;
};

type TableState = {
	loaded: boolean;
	error: string;
	reload: () => void;
	hasMore?: boolean;
	loadingMore?: boolean;
	moreFailed?: boolean;
	loadMore?: () => void;
};

/**
 * Accessible data table: real table semantics, stacked cards on phones, skeleton rows while loading,
 * empty and error states, and page-by-page loading through a visible button plus an automatic
 * near-the-end sentinel. A row with `rowHref` opens on click; its first link stays the keyboard path.
 */
export function DataTable<T>({
	label,
	columns,
	rows,
	rowKey,
	rowHref,
	state,
	locale,
	filtered = false,
	empty,
	loadingText,
}: {
	label: string;
	columns: Column<T>[];
	rows: T[];
	rowKey: (row: T) => string;
	rowHref?: (row: T) => string;
	state: TableState;
	locale: Locale;
	filtered?: boolean;
	empty?: { title?: string; text?: string; icon?: LucideIcon };
	loadingText?: string;
}) {
	const t = consoleCopy[locale];
	const sentinel = useRef<HTMLDivElement>(null);
	const { hasMore, loadingMore, moreFailed, loadMore } = state;

	// Loads the next page shortly before the reader reaches the end of the loaded rows.
	useEffect(() => {
		const node = sentinel.current;
		if (!node || !hasMore || loadingMore || moreFailed || !loadMore) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) loadMore();
			},
			{ rootMargin: "400px 0px" },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [hasMore, loadingMore, moreFailed, loadMore]);

	if (state.error)
		return (
			<StateMessage
				icon={AlertTriangle}
				tone="danger"
				title={t.errorTitle}
				text={state.error}
				action={
					<button type="button" className={ui.button} onClick={state.reload}>
						{t.retry}
					</button>
				}
			/>
		);
	if (state.loaded && rows.length === 0)
		return (
			<StateMessage
				icon={empty?.icon}
				title={filtered ? t.emptyFiltered : (empty?.title ?? t.emptyTitle)}
				text={filtered ? t.emptyFilteredHint : empty?.text}
			/>
		);
	return (
		<>
			{!state.loaded && (
				<p className={ui.srOnly} role="status">
					{loadingText ?? t.loading}
				</p>
			)}
			<div className={ui.tableWrap}>
				<table className={ui.table} aria-label={label} aria-busy={!state.loaded || loadingMore}>
					<thead>
						<tr>
							{columns.map((column) => (
								<th key={column.key} scope="col" data-align={column.align}>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{state.loaded
							? rows.map((row) => {
									const href = rowHref?.(row);
									return (
										<tr
											key={rowKey(row)}
											data-href={href}
											onClick={(event) => {
												if (!href) return;
												const target = event.target as HTMLElement;
												if (target.closest("a, button, input, select, textarea, label")) return;
												if (event.metaKey || event.ctrlKey) window.open(href, "_blank", "noopener");
												// The row's own link navigates, so client routing and prefetch stay Next.js's.
												else
													event.currentTarget
														.querySelector<HTMLAnchorElement>(`a[href="${href}"]`)
														?.click();
											}}
										>
											{columns.map((column) => (
												<td
													key={column.key}
													data-align={column.align}
													data-label={column.primary ? undefined : column.header}
													data-primary={column.primary || undefined}
												>
													{column.cell(row)}
												</td>
											))}
										</tr>
									);
								})
							: Array.from({ length: 6 }, (_, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: Placeholder rows have no identity.
									<tr key={index}>
										{columns.map((column) => (
											<td key={column.key}>
												<span className={ui.skeleton} aria-hidden="true" />
											</td>
										))}
									</tr>
								))}
					</tbody>
				</table>
			</div>
			{state.loaded && loadMore && (
				<div className={ui.tableFooter}>
					<span role="status">
						{t.showing.replace("{count}", String(rows.length))}
						{!hasMore && ` · ${t.allShown}`}
					</span>
					{moreFailed && <span role="alert">{t.moreFailed}</span>}
					{hasMore && (
						<button
							type="button"
							className={ui.button}
							disabled={loadingMore}
							onClick={() => loadMore()}
						>
							{loadingMore ? t.loadingMore : moreFailed ? t.retry : t.loadMore}
						</button>
					)}
				</div>
			)}
			{hasMore && !moreFailed && <div ref={sentinel} className={ui.sentinel} aria-hidden="true" />}
		</>
	);
}

/** Skeleton or error placeholder for a single-record page while it loads. */
export function RecordState({
	state,
	locale,
	children,
}: {
	state: { data: unknown; error: string; reload: () => void };
	locale: Locale;
	children: ReactNode;
}) {
	const t = consoleCopy[locale];
	if (state.error)
		return (
			<Panel>
				<StateMessage
					icon={AlertTriangle}
					tone="danger"
					title={t.errorTitle}
					text={state.error}
					action={
						<button type="button" className={ui.button} onClick={state.reload}>
							{t.retry}
						</button>
					}
				/>
			</Panel>
		);
	if (!state.data)
		return (
			<Panel>
				<div role="status" aria-label={t.loading} className={ui.skeletonStack}>
					<span className={ui.skeleton} />
					<span className={ui.skeleton} />
					<span className={ui.skeleton} />
				</div>
			</Panel>
		);
	return children;
}
