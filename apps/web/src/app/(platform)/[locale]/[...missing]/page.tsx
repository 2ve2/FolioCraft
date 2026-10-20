import { notFound } from "next/navigation";

/** Sends unknown paths under a language prefix to that language's not-found page. */
export default function MissingPage() {
	notFound();
}
