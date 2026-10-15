"use client";

import {
	type ButtonHTMLAttributes,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./tooltip-button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { hint: string };

/** Adds a non-interactive explanation without changing the button's layout or click action. */
export function TooltipButton({ hint, children, ...props }: Props) {
	const id = useId();
	const button = useRef<HTMLButtonElement>(null);
	const bubble = useRef<HTMLDivElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [open, setOpen] = useState(false);
	const [placement, setPlacement] = useState<{
		top: number;
		left: number;
		arrow: number;
		side: "top" | "bottom";
		dir: "rtl" | "ltr";
	} | null>(null);

	/** Cancels a pending tooltip visibility transition. */
	const clearTimer = () => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	};

	/** Closes the transient control without changing its selected value. */
	const close = () => {
		clearTimer();
		setOpen(false);
		setPlacement(null);
	};

	/** Schedules a tooltip only while its trigger is enabled. */
	const show = (delay = 0) => {
		clearTimer();
		if (!props.disabled) timer.current = setTimeout(() => setOpen(true), delay);
	};

	/** Dismisses pointer hints while preserving keyboard-focused explanations. */
	const leave = () => {
		if (!button.current?.matches(":focus-visible")) {
			clearTimer();
			timer.current = setTimeout(close, 120);
		}
	};

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	useEffect(() => {
		if (props.disabled) {
			if (timer.current) clearTimeout(timer.current);
			setOpen(false);
			setPlacement(null);
		}
	}, [props.disabled]);
	useLayoutEffect(() => {
		if (!hint || !open || !button.current || !bubble.current) return;
		const anchor = button.current.getBoundingClientRect();
		const tip = bubble.current.getBoundingClientRect();
		const left = Math.max(
			12,
			Math.min(anchor.left + anchor.width / 2 - tip.width / 2, window.innerWidth - tip.width - 12),
		);
		const above = anchor.top >= tip.height + 16;
		setPlacement({
			left,
			top: Math.max(
				8,
				Math.min(
					above ? anchor.top - tip.height - 9 : anchor.bottom + 9,
					window.innerHeight - tip.height - 8,
				),
			),
			arrow: Math.max(12, Math.min(tip.width - 12, anchor.left + anchor.width / 2 - left)),
			side: above ? "top" : "bottom",
			dir: getComputedStyle(button.current).direction === "rtl" ? "rtl" : "ltr",
		});
	}, [open, hint]);
	useEffect(() => {
		if (!open) return;

		/** Removes a tooltip whose viewport position is no longer current. */
		const dismiss = () => {
			setOpen(false);
			setPlacement(null);
		};

		/** Dismisses an open tooltip without moving keyboard focus. */
		const onEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") dismiss();
		};

		document.addEventListener("keydown", onEscape);
		window.addEventListener("resize", dismiss);
		window.addEventListener("scroll", dismiss, true);
		return () => {
			document.removeEventListener("keydown", onEscape);
			window.removeEventListener("resize", dismiss);
			window.removeEventListener("scroll", dismiss, true);
		};
	}, [open]);
	return (
		<>
			<button
				{...props}
				type={props.type ?? "button"}
				ref={button}
				aria-describedby={
					[props["aria-describedby"], open ? id : null].filter(Boolean).join(" ") || undefined
				}
				onPointerEnter={(event) => {
					props.onPointerEnter?.(event);
					if (event.pointerType !== "touch") show(350);
				}}
				onPointerLeave={(event) => {
					props.onPointerLeave?.(event);
					leave();
				}}
				onFocus={(event) => {
					props.onFocus?.(event);
					show();
				}}
				onBlur={(event) => {
					props.onBlur?.(event);
					clearTimer();
					timer.current = setTimeout(close, 120);
				}}
				onClick={(event) => {
					close();
					props.onClick?.(event);
				}}
			>
				{children}
			</button>
			{open &&
				createPortal(
					<div
						ref={bubble}
						role="tooltip"
						id={id}
						className={styles.bubble}
						dir={placement?.dir}
						data-side={placement?.side}
						style={
							{
								top: placement?.top ?? 0,
								left: placement?.left ?? 0,
								visibility: placement ? "visible" : "hidden",
								"--tip-arrow": `${placement?.arrow ?? 12}px`,
							} as React.CSSProperties
						}
						onPointerEnter={clearTimer}
						onPointerLeave={leave}
					>
						{hint}
					</div>,
					document.body,
				)}
		</>
	);
}
