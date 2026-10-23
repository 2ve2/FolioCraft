"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const focusable = "a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])";

/**
 * Drives a navigation drawer that exists only below `breakpoint`: Escape and the backdrop close it,
 * focus moves into it and back to the toggle, Tab stays inside, and the page behind does not scroll.
 * Widening past the breakpoint closes it, so the desktop sidebar never inherits an open state.
 */
export function useDrawer(breakpoint: number) {
	const [open, setOpen] = useState(false);
	const toggleRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	const close = useCallback((restoreFocus = true) => {
		setOpen(false);
		if (restoreFocus) toggleRef.current?.focus();
	}, []);

	useEffect(() => {
		if (!open) return;
		const panel = panelRef.current;
		const wide = window.matchMedia(`(min-width: ${breakpoint + 1}px)`);
		const onWide = () => wide.matches && setOpen(false);
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close();
				return;
			}
			if (event.key !== "Tab" || !panel) return;
			const items = [...panel.querySelectorAll<HTMLElement>(focusable)].filter(
				(item) => item.offsetParent !== null,
			);
			if (!items.length) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		const root = document.documentElement;
		const overflow = root.style.overflow;
		root.style.overflow = "hidden";
		document.addEventListener("keydown", onKey);
		wide.addEventListener("change", onWide);
		panel?.querySelector<HTMLElement>(focusable)?.focus();
		return () => {
			root.style.overflow = overflow;
			document.removeEventListener("keydown", onKey);
			wide.removeEventListener("change", onWide);
		};
	}, [open, breakpoint, close]);

	return { open, setOpen, close, toggleRef, panelRef };
}
