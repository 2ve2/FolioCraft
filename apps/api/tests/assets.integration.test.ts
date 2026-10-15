import "./test-guard";
import { afterAll, expect, spyOn, test } from "bun:test";
import type { Site } from "@folio/contracts";
import { eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../src/db";
import { assets } from "../src/db/schema/asset";
import { user } from "../src/db/schema/auth";
import { ApiError } from "../src/lib/response-helpers";
import { storage, validateImageBytes } from "../src/lib/storage";
import { account, error, request, result } from "./helpers";

const users: string[] = [];
afterAll(async () => {
	if (users.length) await db.delete(user).where(inArray(user.id, users));
});

/** Exercises the real HTTP/database lifecycle with an explicit in-memory storage transport fixture. */
test("images attach, detach and delete while owned drafts and retained releases remain protected", async () => {
	const objects = new Map<string, Buffer>();
	const configured = spyOn(storage, "assertConfigured").mockImplementation(() => {});
	const sign = spyOn(storage, "uploadUrl").mockImplementation(
		async (key) => `https://fixture.invalid/${key}`,
	);
	const copy = spyOn(storage, "verifyAndCopy").mockImplementation(
		async (staging, key, mime, size) => {
			const bytes = objects.get(staging);
			if (!bytes) throw new ApiError(409, "UPLOAD_NOT_FOUND");
			if (size !== bytes.length) throw new ApiError(422, "UPLOAD_SIZE_MISMATCH");
			const dimensions = await validateImageBytes(bytes, mime);
			objects.set(key, Buffer.from(bytes));
			return dimensions;
		},
	);
	const remove = spyOn(storage, "delete").mockImplementation(async (key) => {
		objects.delete(key);
	});
	try {
		const owner = await account("asset-owner", users);
		const other = await account("asset-other", users);
		let site = await result<Site>(
			await request(
				"/api/sites",
				"POST",
				{ slug: `assets-${crypto.randomUUID()}`, locale: "ar" },
				owner.cookie,
			),
		);
		const base = `/api/sites/${site.id}`;
		const bytes = await sharp({
			create: { width: 48, height: 32, channels: 3, background: "#7150ad" },
		})
			.png()
			.toBuffer();
		const uploaded = async () => {
			const intent = await result<{ id: string }>(
				await request(
					`${base}/assets/upload-intent`,
					"POST",
					{ mime: "image/png", size: bytes.length },
					owner.cookie,
				),
			);
			objects.set(`staging/${site.id}/${intent.id}`, bytes);
			const asset = await result<{ id: string; status: string }>(
				await request(`${base}/assets/${intent.id}/complete`, "POST", undefined, owner.cookie),
			);
			expect(asset.status).toBe("ready");
			expect(objects.get(`verified/${site.id}/${asset.id}`)).toEqual(bytes);
			return asset;
		};
		const draftOnly = await uploaded();
		await error(
			await request(`${base}/assets/${draftOnly.id}`, "DELETE", undefined, other.cookie),
			404,
		);
		site.draft.profile = {
			...site.draft.profile,
			name: "Fictional asset QA",
			role: "Designer",
			imageAssetId: draftOnly.id,
		};
		site = await result<Site>(
			await request(
				`${base}/draft`,
				"PUT",
				{ revision: site.revision, draft: site.draft },
				owner.cookie,
			),
		);
		await error(
			await request(`${base}/assets/${draftOnly.id}`, "DELETE", undefined, owner.cookie),
			409,
			"ASSET_REFERENCED",
		);
		site.draft.profile.imageAssetId = null;
		site = await result<Site>(
			await request(
				`${base}/draft`,
				"PUT",
				{ revision: site.revision, draft: site.draft },
				owner.cookie,
			),
		);
		const deleting = await result<{ status: string }>(
			await request(`${base}/assets/${draftOnly.id}`, "DELETE", undefined, owner.cookie),
		);
		expect(deleting.status).toBe("deleting");
		expect(objects.has(`verified/${site.id}/${draftOnly.id}`)).toBe(false);
		// Preserve the tombstone until an old presigned PUT cannot recreate staging bytes.
		objects.set(`staging/${site.id}/${draftOnly.id}`, bytes);
		await db
			.update(assets)
			.set({ expiresAt: new Date(Date.now() - 120000) })
			.where(eq(assets.id, draftOnly.id));
		expect(
			(
				await result<{ status: string }>(
					await request(`${base}/assets/${draftOnly.id}`, "DELETE", undefined, owner.cookie),
				)
			).status,
		).toBe("deleted");
		expect(objects.has(`staging/${site.id}/${draftOnly.id}`)).toBe(false);
		const released = await uploaded();
		site.draft.profile.imageAssetId = released.id;
		site.draft.appearance.profileVisualVisible = false;
		site.draft.appearance.projectFallbackVisible = false;
		site = await result<Site>(
			await request(
				`${base}/draft`,
				"PUT",
				{ revision: site.revision, draft: site.draft },
				owner.cookie,
			),
		);
		await result(
			await request(`${base}/releases`, "POST", { revision: site.revision }, owner.cookie),
		);
		site.draft.profile.imageAssetId = null;
		site = await result<Site>(
			await request(
				`${base}/draft`,
				"PUT",
				{ revision: site.revision, draft: site.draft },
				owner.cookie,
			),
		);
		await result(
			await request(`${base}/releases`, "POST", { revision: site.revision }, owner.cookie),
		);
		await error(
			await request(`${base}/assets/${released.id}`, "DELETE", undefined, owner.cookie),
			409,
			"ASSET_REFERENCED",
		);
		expect(objects.get(`verified/${site.id}/${released.id}`)).toEqual(bytes);
		expect(site.draft.locale).toBe("ar");
		const publicSite = await result<Site>(await request(`/api/public/sites/${site.slug}`));
		expect(publicSite.draft.appearance.profileVisualVisible).toBe(false);
		expect(publicSite.draft.appearance.projectFallbackVisible).toBe(false);
	} finally {
		configured.mockRestore();
		sign.mockRestore();
		copy.mockRestore();
		remove.mockRestore();
	}
});
