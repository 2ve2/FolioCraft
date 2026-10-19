import { noticeInput } from "@ichnara/contracts";
import { Hono } from "hono";
import { successResponse } from "../../lib/response-helpers";
import { entityId, paginationSchema } from "../../lib/validation";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { noticeService } from "../../services/admin/notice-service";
import { sensitiveSchema } from "../../services/admin/sensitive-action";
export const adminNoticeRoutes = new Hono<AuthEnv>();
const changeInput = sensitiveSchema.extend({ notice: noticeInput });
adminNoticeRoutes.get("/notices", requirePermission("notice", "read"), async (c) => {
	const q = paginationSchema.parse(c.req.query());
	return successResponse(c, await noticeService.list(q.limit, q.offset));
});
adminNoticeRoutes.post("/notices", requirePermission("notice", "manage"), async (c) => {
	const { notice, ...credentials } = changeInput.parse(await c.req.json());
	return successResponse(
		c,
		await noticeService.change(c.req.raw.headers, credentials, notice, undefined, true),
		undefined,
		201,
	);
});
adminNoticeRoutes.patch("/notices/:id", requirePermission("notice", "manage"), async (c) => {
	const { notice, ...credentials } = changeInput.parse(await c.req.json());
	return successResponse(
		c,
		await noticeService.change(c.req.raw.headers, credentials, notice, entityId(c.req.param("id"))),
	);
});
adminNoticeRoutes.post("/notices/:id/disable", requirePermission("notice", "manage"), async (c) =>
	successResponse(
		c,
		await noticeService.change(
			c.req.raw.headers,
			sensitiveSchema.parse(await c.req.json()),
			null,
			entityId(c.req.param("id")),
		),
	),
);
