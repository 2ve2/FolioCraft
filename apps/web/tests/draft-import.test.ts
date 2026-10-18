/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { emptyDraft } from "@ichnara/contracts";
import { DraftImportError, readDraftBackup } from "../src/features/studio/draft-import";

function backup(value: unknown, name = "portfolio-draft.json") {
	return new File([JSON.stringify(value, null, 2)], name, { type: "application/json" });
}

describe("downloaded draft restoration", () => {
	test("round-trips exported Arabic content and appearance", async () => {
		const draft = emptyDraft("ar");
		draft.profile.name = "اختبار استعادة";
		draft.appearance.theme = "dark";
		const restored = await readDraftBackup(backup(draft));
		expect(restored.profile).toEqual({ ...draft.profile, socialLinks: [], imageAssetId: null });
		expect(restored.appearance).toEqual({
			...draft.appearance,
			profileVisualVisible: true,
			projectFallbackVisible: true,
		});
		expect(restored.locale).toBe("ar");
	});
	test("explicit hidden visuals survive backup restoration", async () => {
		const draft = emptyDraft("en");
		draft.appearance.profileVisualVisible = false;
		draft.appearance.projectFallbackVisible = false;
		expect((await readDraftBackup(backup(draft))).appearance).toEqual(draft.appearance);
	});
	test("legacy exports explicitly clear absent optional content collections", async () => {
		const restored = await readDraftBackup(backup(emptyDraft("en")));
		expect(restored.experiences).toEqual([]);
		expect(restored.education).toEqual([]);
		expect(restored.skills).toEqual([]);
		expect(restored.articles).toEqual([]);
		expect(restored.profile.socialLinks).toEqual([]);
	});
	test("legacy project restore clears rich text and gallery fields retained by old-client merge", async () => {
		const draft = emptyDraft("en");
		draft.projects = [
			{
				id: "e3fe6a82-6e4b-4e37-9306-45e2f0cf57fa",
				title: "Original project",
				summary: "",
				body: "Original plain text",
				role: "",
				year: "",
				tools: "",
				url: "",
				coverAssetId: null,
			},
		];
		const restored = await readDraftBackup(backup(draft));
		expect(restored.projects[0].body).toBe("Original plain text");
		expect(restored.projects[0].richBody).toEqual([]);
		expect(restored.projects[0].galleryAssetIds).toEqual([]);
		expect(restored.projects[0].featured).toBe(false);
		expect(restored.sectionVisibility?.skills).toBe(true);
	});
	test("rejects unsupported versions, malformed JSON and unsafe content", async () => {
		await expect(
			readDraftBackup(backup({ ...emptyDraft("en"), schemaVersion: 2 })),
		).rejects.toBeInstanceOf(DraftImportError);
		await expect(readDraftBackup(new File(["{broken"], "draft.json"))).rejects.toBeInstanceOf(
			DraftImportError,
		);
		const unsafe = emptyDraft("en");
		unsafe.profile.website = "javascript:alert(1)";
		await expect(readDraftBackup(backup(unsafe))).rejects.toBeInstanceOf(DraftImportError);
	});
	test("rejects oversized input before reading it", async () => {
		let read = false;
		await expect(
			readDraftBackup({
				name: "draft.json",
				size: 2 * 1024 * 1024 + 1,
				text: async () => {
					read = true;
					return "{}";
				},
			}),
		).rejects.toMatchObject({ reason: "size" });
		expect(read).toBe(false);
	});
});
