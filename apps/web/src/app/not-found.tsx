/** Renders the application missing-page response. */
export default function NotFound() {
	return (
		<main className="public-error">
			<h1>الموقع غير منشور · Portfolio not published</h1>
			<p>
				لم يتم العثور على نسخة منشورة لهذا العنوان.
				<br />
				There is no published portfolio at this address.
			</p>
			<a href="/">FolioCraft Studio ←</a>
		</main>
	);
}
