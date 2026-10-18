import "./test-guard";
import { expect, spyOn, test } from "bun:test";
import { validateImageBytes } from "../src/lib/storage/image-validation.worker";
import {
	currentImagesBinding,
	type ImagesBinding,
	withImagesBinding,
} from "../src/lib/storage/worker-images-context";

/** Supplies only the Images interface; this is not live provider acceptance. */
function binding(
	options: { infoError?: string; decodeError?: string; empty?: boolean; width?: number } = {},
): ImagesBinding {
	return {
		async info() {
			if (options.infoError) throw new Error(options.infoError);
			return { format: "jpeg", width: options.width ?? 8, height: 6 };
		},
		input() {
			return {
				transform() {
					return {
						async output() {
							if (options.decodeError) throw new Error(options.decodeError);
							return {
								response: () =>
									new Response(options.empty ? new Uint8Array() : new Uint8Array([1])),
							};
						},
					};
				},
			};
		},
	};
}

test("Workers decoder separates provider failures from invalid uploads and redacts diagnostics", async () => {
	const logs: string[] = [];
	const warning = spyOn(console, "warn").mockImplementation((value) => logs.push(String(value)));
	const bytes = Buffer.from([1, 2, 3]);
	try {
		await expect(validateImageBytes(bytes, "image/jpeg")).rejects.toMatchObject({
			code: "STORAGE_UNAVAILABLE",
		});
		for (const code of ["9422", "9432", "9424", "9529"]) {
			await expect(
				withImagesBinding(binding({ decodeError: `${code} secret signed-url` }), () =>
					validateImageBytes(bytes, "image/jpeg"),
				),
			).rejects.toMatchObject({ status: 502, code: "STORAGE_PROVIDER_ERROR" });
		}
		await expect(
			withImagesBinding(binding({ infoError: "9523 private-bucket" }), () =>
				validateImageBytes(bytes, "image/jpeg"),
			),
		).rejects.toMatchObject({ status: 422, code: "INVALID_IMAGE" });
		await expect(
			withImagesBinding(binding({ infoError: "Unknown service failure with private-key" }), () =>
				validateImageBytes(bytes, "image/jpeg"),
			),
		).rejects.toMatchObject({ status: 502 });
		await expect(
			withImagesBinding(binding({ width: 4097 }), () => validateImageBytes(bytes, "image/jpeg")),
		).rejects.toMatchObject({ code: "INVALID_IMAGE" });
		await expect(
			withImagesBinding(binding({ empty: true }), () => validateImageBytes(bytes, "image/jpeg")),
		).rejects.toMatchObject({ status: 502 });
		expect(logs.join(" ")).not.toMatch(/secret|signed-url|private-bucket|private-key/);
		expect(logs.map((line) => JSON.parse(line).stage)).toContain("decode");
	} finally {
		warning.mockRestore();
	}
});

test("Images binding survives awaits and remains isolated between concurrent requests", async () => {
	const first = binding();
	const second = binding({ width: 12 });
	const values = await Promise.all(
		[first, second].map((capability) =>
			withImagesBinding(capability, async () => {
				await new Promise((resolve) => setTimeout(resolve, 1));
				expect(currentImagesBinding()).toBe(capability);
				return validateImageBytes(Buffer.from([1]), "image/jpeg");
			}),
		),
	);
	expect(values).toEqual([
		{ width: 8, height: 6 },
		{ width: 12, height: 6 },
	]);
	expect(currentImagesBinding()).toBeUndefined();
	await expect(
		withImagesBinding(first, () =>
			validateImageBytes(Buffer.alloc(5 * 1024 * 1024 + 1), "image/jpeg"),
		),
	).rejects.toMatchObject({ code: "UPLOAD_SIZE_MISMATCH" });
});
