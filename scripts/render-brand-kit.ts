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
await copyFile(
	resolve(directory, "icon-180.png"),
	resolve(import.meta.dir, "../apps/web/src/app/apple-icon.png"),
);
