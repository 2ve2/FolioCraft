import type { Metadata } from "next";
import { NotFoundScreen } from "../../../../features/not-found/not-found-screen";

export const metadata: Metadata = {
	title: "404 — Ichnara",
};

/** Renders the branded missing-portfolio boundary inside the portfolio root layout. */
export default function NotFound() {
	return <NotFoundScreen />;
}
