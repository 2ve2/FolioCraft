import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "../apps/api/node_modules/sharp";

// Render the same vector masters; this utility has no provider or database access.
const directory = resolve(import.meta.dir, "../apps/web/public/brand/ichnara");
for (const entry of new Bun.Glob("*.svg").scanSync(directory)) {
	if (entry.startsWith("ichnara-initial-") || entry === "favicon.svg") continue;
	await sharp(resolve(directory, entry))
		.resize({
			width: entry.startsWith("ichnara-emblem-")
				? 1024
				: entry === "brand-overview.svg"
					? 1600
					: 2400,
		})
		.png()
		.toFile(resolve(directory, entry.replace(".svg", ".png")));
}
for (const size of [16, 32, 48, 64, 180, 192, 512]) {
	await sharp(resolve(directory, "favicon.svg"))
		.resize(size, size)
		.png()
		.toFile(resolve(directory, `icon-${size}.png`));
}
// Email logos: both languages at one scale, the English lockup 36px tall, rendered at 2x for sharp
// display. Authentication emails reference these by URL (SVG is not shown by most mail clients).
const viewBox = async (file: string) =>
	(await Bun.file(resolve(directory, file)).text())
		.match(/viewBox="([^"]+)"/)?.[1]
		.split(" ")
		.map(Number) ?? [];
const englishHeight = (await viewBox("ichnara-logo-duo.svg"))[3];
for (const [lang, file] of [
	["en", "ichnara-logo-duo.svg"],
	["ar", "ichnara-logo-ar-duo.svg"],
] as const) {
	const [, , width, height] = await viewBox(file);
	const scale = 72 / englishHeight;
	await sharp(resolve(directory, file), { density: 300 })
		.resize(Math.round((width * scale) / 2) * 2, Math.round((height * scale) / 2) * 2)
		.png()
		.toFile(resolve(directory, `ichnara-email-${lang}.png`));
}
await copyFile(
	resolve(directory, "icon-180.png"),
	resolve(import.meta.dir, "../apps/web/src/app/apple-icon.png"),
);
