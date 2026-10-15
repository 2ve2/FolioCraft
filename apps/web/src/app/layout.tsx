import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/noto-naskh-arabic";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./globals.css";
export const metadata: Metadata = {
	title: "FolioCraft — Portfolio Studio",
	description: "مساحة لعرض عملك بطريقتك. A considered home for your work.",
	robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" dir="ltr">
			<body>{children}</body>
		</html>
	);
}
