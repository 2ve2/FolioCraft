import type { ReactNode } from "react";
import { safeHttpUrl } from "./format";

/**
 * Opens an owner-supplied URL in a new tab. Only HTTP(S) targets render; the link never
 * exposes the opener or referrer and is marked as user content so it passes no ranking.
 */
export function ExternalLink({
	href,
	className,
	dir,
	children,
}: {
	href: string | undefined;
	className: string;
	dir?: "auto";
	children: ReactNode;
}) {
	const url = href ? safeHttpUrl(href) : undefined;
	if (!url) return null;
	return (
		<a
			className={className}
			href={url}
			dir={dir}
			target="_blank"
			rel="ugc nofollow noopener noreferrer"
		>
			{children}
		</a>
	);
}
