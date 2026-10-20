import type { Metadata } from "next";
import "../root-styles";

export const metadata: Metadata = {
	title: "Ichnara — Portfolio Studio",
	description: "مساحة لعرض عملك بطريقتك. A considered home for your work.",
	robots: { index: false, follow: false },
};

/** Applies application metadata, fonts and the default document direction. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" dir="ltr">
			<body>{children}</body>
		</html>
	);
}
