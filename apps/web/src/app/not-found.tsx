import type { Metadata } from "next";
import { NotFoundScreen } from "../features/not-found/not-found-screen";

export const metadata: Metadata = {
	title: "404 — FolioCraft",
};

/** Renders the branded missing-page boundary without changing public lookup semantics. */
export default function NotFound() {
	return <NotFoundScreen />;
}
