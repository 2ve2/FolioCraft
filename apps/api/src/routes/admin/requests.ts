import { dataRequestInput, dataRequestStatuses, dataRequestTypes } from "@ichnara/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { successResponse } from "../../lib/response-helpers";
import { entityId } from "../../lib/validation";
import { requirePermission } from "../../middleware/admin";
import type { AuthEnv } from "../../middleware/auth";
import { requestService } from "../../services/admin/request-service";
import { sensitiveSchema } from "../../services/admin/sensitive-action";
import { booleanQuery } from "./validation";
export const adminRequestRoutes = new Hono<AuthEnv>();
const note = z.string().trim().min(10).max(500);
adminRequestRoutes.get("/requests", requirePermission("request", "read"), async (c) => {
	const q = z
		.object({
			limit: z.coerce.number().int().min(1).max(100).default(20),
			cursor: z.uuid().optional(),
			status: z.enum(dataRequestStatuses).optional(),
			type: z.enum(dataRequestTypes).optional(),
			overdue: booleanQuery.optional(),
		})
		.strict()
		.parse(c.req.query());
	return successResponse(c, await requestService.list(q));
});
adminRequestRoutes.get("/requests/:id", requirePermission("request", "read"), async (c) =>
	successResponse(c, await requestService.get(entityId(c.req.param("id")))),
);
adminRequestRoutes.post("/requests", requirePermission("request", "handle"), async (c) => {
	const { request, ...credentials } = sensitiveSchema
		.extend({ request: dataRequestInput })
		.parse(await c.req.json());
	return successResponse(
		c,
		await requestService.change(c.req.raw.headers, crypto.randomUUID(), credentials, {
			kind: "create",
			...request,
		}),
		undefined,
		201,
	);
});
adminRequestRoutes.patch(
	"/requests/:id/status",
	requirePermission("request", "handle"),
	async (c) => {
		const { status, notes, ...credentials } = sensitiveSchema
			.extend({ status: z.enum(dataRequestStatuses), notes: note.optional() })
			.refine((v) => !["completed", "rejected"].includes(v.status) || Boolean(v.notes), {
				path: ["notes"],
				message: "Closure evidence required",
			})
			.parse(await c.req.json());
		return successResponse(
			c,
			await requestService.change(c.req.raw.headers, entityId(c.req.param("id")), credentials, {
				kind: "status",
				status,
				notes,
			}),
		);
	},
);
adminRequestRoutes.post(
	"/requests/:id/subject",
	requirePermission("request", "handle"),
	async (c) => {
		const { userId, confirmation, evidence, ...credentials } = sensitiveSchema
			.extend({
				userId: z.string().min(1).max(128),
				confirmation: z.string().min(1).max(128),
				evidence: note,
			})
			.parse(await c.req.json());
		return successResponse(
			c,
			await requestService.change(c.req.raw.headers, entityId(c.req.param("id")), credentials, {
				kind: "subject",
				userId,
				confirmation,
				evidence,
			}),
		);
	},
);
adminRequestRoutes.post(
	"/requests/:id/export",
	requirePermission("request", "export"),
	async (c) => {
		const output = await requestService.export(
			c.req.raw.headers,
			entityId(c.req.param("id")),
			sensitiveSchema.parse(await c.req.json()),
		);
		c.header("Content-Type", "application/json; charset=utf-8");
		c.header("Content-Disposition", 'attachment; filename="subject-data.json"');
		c.header("X-Content-Type-Options", "nosniff");
		return c.body(output);
	},
);
