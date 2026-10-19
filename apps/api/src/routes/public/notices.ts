import { Hono } from "hono";
import { successResponse } from "../../lib/response-helpers";
import type { AuthEnv } from "../../middleware/auth";
import { noticeService } from "../../services/admin/notice-service";
export const publicNoticeRoutes = new Hono<AuthEnv>();
publicNoticeRoutes.get("/notices", async (c) => successResponse(c, await noticeService.public()));
