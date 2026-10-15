"use client";
import { Check, ChevronDown } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string; description?: string; code?: string };
type Props = {
	label: string;
	options: SelectOption[];
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	name?: string;
	disabled?: boolean;
	compact?: boolean;
	icon?: ReactNode;
	menuTitle?: string;
};

/** Shared styled selection with native form values, keyboard navigation and viewport-safe placement. */
export function SelectControl({
	label,
	options,
	value,
	defaultValue,
	onChange,
	name,
	disabled = false,
	compact = false,
	icon,
	menuTitle,
}: Props) {
	const [localValue, setLocalValue] = useState(defaultValue ?? options[0]?.value ?? "");
	const selected = value ?? localValue;
	const [open, setOpen] = useState(false);
	const [inheritedDisabled, setInheritedDisabled] = useState(false);
	const [position, setPosition] = useState<{ style: CSSProperties; dir: "rtl" | "ltr" } | null>(
		null,
	);
	const root = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const search = useRef({ text: "", time: 0 });
	const initialFocus = useRef(0);
	const id = useId();
	const active = options.find((option) => option.value === selected);
	const effectiveDisabled = disabled || inheritedDisabled;

	/** Includes inherited fieldset disabling when deciding whether selection is allowed. */
	const isDisabled = () => effectiveDisabled || Boolean(trigger.current?.matches(":disabled"));

	/** Carries native fieldset disabling through the menu's document-body portal. */
	useEffect(() => {
		/** Synchronizes inherited fieldset disabling with the portaled selection menu. */
		const sync = () => setInheritedDisabled(Boolean(trigger.current?.matches(":disabled")));

		const observer = new MutationObserver(sync);
		let ancestor = root.current?.parentElement;
		while (ancestor) {
			if (ancestor.tagName === "FIELDSET")
				observer.observe(ancestor, { attributes: true, attributeFilter: ["disabled"] });
			ancestor = ancestor.parentElement;
		}
		sync();
		return () => observer.disconnect();
	}, []);

	/** Selects the initial focus target once for each opening. */
	const show = (index?: number) => {
		if (isDisabled()) return;
		initialFocus.current =
			index ??
			Math.max(
				0,
				options.findIndex((option) => option.value === selected),
			);
		setOpen(true);
	};

	/** Closes the transient control without changing its selected value. */
	const close = (focus = false) => {
		setOpen(false);
		if (focus) trigger.current?.focus();
	};

	useEffect(() => {
		if (!open) return;
		if (effectiveDisabled) {
			setOpen(false);
			return;
		}

		/** Positions the selection menu inside the current viewport. */
		const place = () => {
			if (!root.current) return;
			const rect = root.current.getBoundingClientRect();
			const dir = getComputedStyle(root.current).direction === "rtl" ? "rtl" : "ltr";
			const width = Math.min(Math.max(rect.width, compact ? 252 : 220), window.innerWidth - 24);
			const below = window.innerHeight - rect.bottom - 20;
			const above = rect.top - 20;
			const upwards = below < 180 && above > below;
			const height = Math.min(360, Math.max(100, upwards ? above : below));
			const left = Math.max(
				12,
				Math.min(dir === "rtl" ? rect.right - width : rect.left, window.innerWidth - width - 12),
			);
			setPosition({
				dir,
				style: {
					position: "fixed",
					left,
					width,
					maxHeight: height,
					...(upwards ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
				},
			});
		};

		place();

		/** Dismisses the selection menu when a pointer leaves both control surfaces. */
		const outside = (e: PointerEvent) => {
			const target = e.target as Node;
			if (!root.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
		};

		/** Repositions the menu when an ancestor scrolls outside its own options. */
		const scroll = (e: Event) => {
			if (!menu.current?.contains(e.target as Node)) place();
		};

		document.addEventListener("pointerdown", outside);
		window.addEventListener("resize", place);
		window.addEventListener("scroll", scroll, true);
		return () => {
			document.removeEventListener("pointerdown", outside);
			window.removeEventListener("resize", place);
			window.removeEventListener("scroll", scroll, true);
		};
	}, [open, effectiveDisabled, compact]);
	const focusReady = open && position !== null;
	useEffect(() => {
		if (focusReady) optionRefs.current[initialFocus.current]?.focus();
	}, [focusReady]);

	/** Commits the chosen option and returns focus to the trigger. */
	const choose = (next: string) => {
		if (!isDisabled()) {
			setLocalValue(next);
			onChange?.(next);
		}
		close(true);
	};

	return (
		<div className={`select-root${compact ? " select-root--compact" : ""}`} ref={root}>
			{name && <input type="hidden" name={name} value={selected} disabled={effectiveDisabled} />}
			<button
				type="button"
				ref={trigger}
				className="select-trigger"
				disabled={disabled}
				aria-label={label}
				aria-describedby={`${id}-value`}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? id : undefined}
				onClick={() => {
					if (open) close();
					else show();
				}}
				onKeyDown={(e) => {
					if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
						e.preventDefault();
						show(e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : undefined);
					}
				}}
			>
				{icon}
				<span id={`${id}-value`} className="select-value" dir="auto">
					{active?.label ?? selected}
				</span>
				<ChevronDown size={14} className={open ? "select-chevron open" : "select-chevron"} />
			</button>
			{open &&
				position &&
				createPortal(
					<div
						ref={menu}
						id={id}
						className="select-popup"
						role="listbox"
						aria-label={label}
						dir={position.dir}
						style={position.style}
						onBlur={(e) => {
							const target = e.relatedTarget as Node | null;
							if (!menu.current?.contains(target) && !root.current?.contains(target))
								setOpen(false);
						}}
						onKeyDown={(e) => {
							if (e.key === "Tab") {
								close(true);
								return;
							}
							if (e.key === "Escape") {
								e.preventDefault();
								close(true);
								return;
							}
							const current = optionRefs.current.indexOf(
								document.activeElement as HTMLButtonElement,
							);
							if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
								e.preventDefault();
								const next =
									e.key === "Home"
										? 0
										: e.key === "End"
											? options.length - 1
											: (current + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
												options.length;
								optionRefs.current[next]?.focus();
							} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
								const now = Date.now();
								search.current = {
									text: now - search.current.time > 700 ? e.key : search.current.text + e.key,
									time: now,
								};
								const index = options.findIndex((option) =>
									option.label
										.toLocaleLowerCase()
										.startsWith(search.current.text.toLocaleLowerCase()),
								);
								if (index >= 0) {
									e.preventDefault();
									optionRefs.current[index]?.focus();
								}
							}
						}}
					>
						{menuTitle && <p className="select-popup-title">{menuTitle}</p>}
						{options.map((option, index) => (
							<button
								key={option.value}
								type="button"
								ref={(el) => {
									optionRefs.current[index] = el;
								}}
								className="select-option"
								role="option"
								tabIndex={-1}
								aria-selected={selected === option.value}
								disabled={effectiveDisabled}
								onClick={() => choose(option.value)}
							>
								{option.code && (
									<span className="select-code" aria-hidden="true">
										{option.code}
									</span>
								)}
								<span className="select-option-copy">
									<strong dir="auto">{option.label}</strong>
									{option.description && <small>{option.description}</small>}
								</span>
								{selected === option.value && <Check size={16} className="select-check" />}
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}
