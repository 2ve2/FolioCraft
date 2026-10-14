import "./test-guard";
import { expect, test } from "bun:test";
import sharp from "sharp";
import { validateImageBytes } from "../src/lib/storage";

test("image validation decodes real PNG/JPEG/WebP bytes and rejects invalid uploads", async () => {
	for (const format of ["png", "jpeg", "webp"] as const) {
		const bytes = await sharp({
			create: { width: 8, height: 6, channels: 3, background: "#2277aa" },
		})
			.toFormat(format)
			.toBuffer();
		expect(await validateImageBytes(bytes, `image/${format}`)).toEqual({ width: 8, height: 6 });
		await expect(
			validateImageBytes(bytes, format === "png" ? "image/jpeg" : "image/png"),
		).rejects.toMatchObject({ code: "INVALID_IMAGE" });
	}
	await expect(
		validateImageBytes(Buffer.from("<html><script>alert(1)</script></html>"), "image/png"),
	).rejects.toMatchObject({ code: "INVALID_IMAGE" });
	const oversized = await sharp({
		create: { width: 4097, height: 1, channels: 3, background: "#111111" },
	})
		.png()
		.toBuffer();
	await expect(validateImageBytes(oversized, "image/png")).rejects.toMatchObject({
		code: "INVALID_IMAGE",
	});
	const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#2277aa" } })
		.png()
		.toBuffer();
	await expect(validateImageBytes(png.subarray(0, 40), "image/png")).rejects.toMatchObject({
		code: "INVALID_IMAGE",
	});
});
