import type { Metadata } from "next";
import { NotFoundScreen } from "../features/not-found/not-found-screen";
import "./root-styles";

export const metadata: Metadata = {
	title: "404 — Ichnara",
	robots: { index: false, follow: false },
};

/** Renders the branded page for unmatched URLs across both root layouts. */
export default function GlobalNotFound() {
	return (
		<html lang="en" dir="ltr">
			<body>
				<NotFoundScreen />
			</body>
		</html>
	);
}
