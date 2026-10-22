import type { Metadata } from "next";
import { NotFoundScreen } from "../../../../../features/not-found/not-found-screen";

// Language-neutral: the visitor's language is only known inside the layout.
export const metadata: Metadata = { title: "404" };

/** Renders the branded missing-portfolio page in the visitor's language (set by the layout). */
export default function NotFound() {
	return <NotFoundScreen />;
}
