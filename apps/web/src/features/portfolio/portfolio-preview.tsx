"use client";
import type { Draft } from "@folio/contracts";
import { Portfolio, PortfolioDetail } from "@folio/portfolio";
import { type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { InquiryForm } from "./inquiry-form";

type PreviewProps = {
	draft: Draft;
	slug: string;
	assetUrls: Record<string, string>;
	device: "desktop" | "mobile";
	actualSize?: boolean;
};

/** Uses real device layout widths; scaling changes presentation without changing container breakpoints. */
export function PortfolioPreview({
	draft,
	slug,
	assetUrls,
	device,
	actualSize = false,
}: PreviewProps) {
	const container = useRef<HTMLDivElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const anchorPrefix = `preview-${useId()}-`;
	const publicBasePath = `/p/${encodeURIComponent(slug)}`;
	const [detail, setDetail] = useState<{ type: "project" | "article"; id: string } | null>(null);
	const returnAnchor = useRef("");
	const [metrics, setMetrics] = useState({ width: 390, height: 1200 });
	const width =
		device === "desktop"
			? actualSize && metrics.width >= 700
				? Math.min(1100, metrics.width)
				: 1100
			: actualSize && metrics.width > 0
				? Math.min(390, metrics.width)
				: 390;
	useEffect(() => {
		/** Measures preview content so scaling preserves the selected device layout. */
		const measure = () => {
			if (!container.current || !content.current) return;
			const next = { width: container.current.clientWidth, height: content.current.scrollHeight };
			setMetrics((previous) =>
				previous.width === next.width && previous.height === next.height ? previous : next,
			);
		};

		const observer = new ResizeObserver(measure);
		if (container.current) observer.observe(container.current);
		if (content.current) observer.observe(content.current);
		measure();
		return () => observer.disconnect();
	}, []);
	const scale = actualSize ? 1 : Math.min(1, metrics.width / width);
	useEffect(() => {
		const frame = requestAnimationFrame(() => {
			const scroller = container.current?.closest<HTMLElement>(
				".portfolio-viewport, .expanded-preview-content",
			);
			if (!scroller) return;
			const target = returnAnchor.current
				? content.current?.querySelector<HTMLElement>(`#${CSS.escape(returnAnchor.current)}`)
				: null;
			scroller.scrollTo({
				top: target
					? scroller.scrollTop +
						target.getBoundingClientRect().top -
						scroller.getBoundingClientRect().top -
						scroller.clientTop
					: 0,
				behavior: "instant",
			});
			returnAnchor.current = "";
			if (detail) content.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
		});
		return () => cancelAnimationFrame(frame);
	}, [detail]);

	/** Keeps preview anchors inside their own scroll surface without changing the editor URL. */
	function navigatePreview(event: MouseEvent<HTMLDivElement>) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		const link = event.target instanceof Element ? event.target.closest("a") : null;
		const href = link?.getAttribute("href");
		if (!href) return;
		const url = new URL(href, window.location.origin);
		if (url.origin === window.location.origin && url.pathname.startsWith(`${publicBasePath}/`)) {
			const [type, value] = url.pathname.slice(publicBasePath.length + 1).split("/");
			const project =
				type === "projects" &&
				draft.projects.find((item) => (item.slug || item.id) === decodeURIComponent(value));
			const article =
				type === "articles" &&
				draft.articles?.find((item) => item.slug === decodeURIComponent(value));
			if (project) {
				event.preventDefault();
				setDetail({ type: "project", id: project.id });
			} else if (article) {
				event.preventDefault();
				setDetail({ type: "article", id: article.id });
			}
			return;
		}
		if (url.origin === window.location.origin && url.pathname === publicBasePath) {
			event.preventDefault();
			if (detail) {
				returnAnchor.current = url.hash.slice(1);
				setDetail(null);
				return;
			}
			if (!url.hash) {
				container.current
					?.closest<HTMLElement>(".portfolio-viewport, .expanded-preview-content")
					?.scrollTo({ top: 0, behavior: "instant" });
				return;
			}
		} else if (!href.startsWith("#")) return;
		const target = content.current?.querySelector<HTMLElement>(`#${CSS.escape(url.hash.slice(1))}`);
		const scroller = container.current?.closest<HTMLElement>(
			".portfolio-viewport, .expanded-preview-content",
		);
		if (!target || !scroller) return;
		event.preventDefault();
		scroller.scrollTo({
			top:
				scroller.scrollTop +
				target.getBoundingClientRect().top -
				scroller.getBoundingClientRect().top -
				scroller.clientTop,
			behavior: "instant",
		});
	}

	const project =
		detail?.type === "project" ? draft.projects.find((item) => item.id === detail.id) : undefined;
	const article =
		detail?.type === "article" ? draft.articles?.find((item) => item.id === detail.id) : undefined;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Delegates existing semantic anchor clicks; no new interactive surface.
		// biome-ignore lint/a11y/useKeyWithClickEvents: Enter on the native links emits the same delegated click event.
		<div
			className={`portfolio-preview-stage${actualSize ? " portfolio-preview-stage--actual" : ""}`}
			ref={container}
			onClick={navigatePreview}
		>
			<div
				style={{
					position: "relative",
					marginInline: "auto",
					width: width * scale,
					height: metrics.height * scale,
				}}
			>
				<div
					className="portfolio-preview-content"
					ref={content}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width,
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				>
					{project || article ? (
						<PortfolioDetail
							draft={draft}
							project={project}
							article={article}
							assetUrls={assetUrls}
							publicBasePath={publicBasePath}
							anchorPrefix={anchorPrefix}
						/>
					) : (
						<Portfolio
							draft={draft}
							anchorPrefix={anchorPrefix}
							publicBasePath={publicBasePath}
							assetUrls={assetUrls}
							contactForm={<InquiryForm slug={slug} locale={draft.locale} preview />}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

/** Native modal provides focus containment and Escape dismissal for a larger private preview. */
export function ExpandedPortfolioPreview({
	locale,
	onClose,
	...props
}: PreviewProps & {
	locale: "ar" | "en";
	onClose: () => void;
}) {
	const dialog = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const element = dialog.current;
		const previousFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const bodyOverflow = document.body.style.overflow;
		const rootOverflow = document.documentElement.style.overflow;
		document.body.style.overflow = "hidden";
		document.documentElement.style.overflow = "hidden";
		element?.showModal();
		return () => {
			element?.close();
			document.body.style.overflow = bodyOverflow;
			document.documentElement.style.overflow = rootOverflow;
			previousFocus?.focus({ preventScroll: true });
		};
	}, []);
	return (
		<dialog
			ref={dialog}
			className="expanded-preview"
			dir={locale === "ar" ? "rtl" : "ltr"}
			aria-label={locale === "ar" ? "المعاينة الموسعة" : "Expanded preview"}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			<header>
				<div>
					<h2>{locale === "ar" ? "المعاينة الموسعة" : "Expanded preview"}</h2>
					<p className="muted">
						{locale === "ar"
							? "للمعاينة فقط؛ إرسال الرسائل متاح من الموقع المنشور."
							: "Preview only; messages can be sent on the published site."}
					</p>
				</div>
				<button type="button" className="secondary" onClick={onClose}>
					{locale === "ar" ? "إغلاق" : "Close"}
				</button>
			</header>
			<div className="expanded-preview-content">
				<PortfolioPreview {...props} actualSize />
			</div>
		</dialog>
	);
}
